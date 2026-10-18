"""Program workflow extension using the SAME SQLite connection and submission IDs."""
import json
import copy
import secrets
import hashlib
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator
from fastapi import Depends, HTTPException
from services.screening import MODULES, FIELDS, score, DEFAULT_RUBRIC, pending_assessment_domains
from services.financials import financials
from services.category import apply_category
from services.qwen_service import QwenService

CRITICAL=["overview.productService","overview.proposedLocation","market.targetCustomers","finance.initialInvestment","finance.unitCost","finance.sellingPrice","finance.monthlyExpenses","finance.expectedSales"]
RECOMMENDATIONS=["FURTHER_MENTORING_REQUIRED","PILOT_VALIDATION_RECOMMENDED","BUSINESS_LAUNCH_READY","INVESTMENT_READINESS_REVIEW_RECOMMENDED"]
DECISIONS=["APPROVE_RECOMMENDATION","RETURN_FOR_CLARIFICATION","RETURN_FOR_MENTORING","REJECT_WITH_REASON"]

class StructuredFact(BaseModel):
    model_config=ConfigDict(extra="forbid")
    value:str=Field(min_length=1,max_length=2000)
    amount:float|None=Field(default=None,ge=0,allow_inf_nan=False)
    currency:str|None=None
    unit:str|None=None
    period:str|None=None
    costBasis: Literal["fixed","total","variable"]|None=None
    estimate:bool=False

    @model_validator(mode="after")
    def explicit_amount(self):
        from services.indictrans_service import numbers
        if self.amount is not None and not any(float(n)==self.amount for n in numbers(self.value)):
            raise ValueError("The structured amount must match a number explicitly written in the field value")
        return self

class StructuredRequest(BaseModel):
    model_config=ConfigDict(extra="forbid")
    title:str=Field(min_length=1,max_length=200)
    language:str="en"
    cohortId:str|None=None
    region:str=Field(default='',max_length=200)
    trade:str=""
    fields:dict[str,StructuredFact]

class ConfirmFields(BaseModel):
    fields:list[str]
    rejected:list[str]=Field(default_factory=list)

class Reason(BaseModel):
    reason:str=Field(min_length=5,max_length=4000)

class Recommendation(Reason):
    recommendation:str
    overrides:dict[str,float]=Field(default_factory=dict)

class Decision(Reason):
    decision:str

class EntityRequest(BaseModel):
    id:str=Field(min_length=1,max_length=80,pattern=r"^[A-Za-z0-9_-]+$")
    data:dict

class AccountRequest(BaseModel):
    id:str=Field(min_length=1,max_length=80,pattern=r"^[A-Za-z0-9_-]+$")
    role:str
    name:str=Field(min_length=1,max_length=200)
    assessor_id:str|None=None

class AssignRequest(Reason):
    assessor_id:str|None=None

class TaskUpdate(BaseModel):
    task_id:str
    evidence:str=Field(min_length=3,max_length=4000)

class PlanEdit(BaseModel):
    sections:dict[str,str]

class ProfileRequest(BaseModel):
    name:str=Field(default="",max_length=200)
    region:str=Field(default="",max_length=200)
    trade:str=Field(default="",max_length=200)
    cohortId:str|None=None
    preferred_language:str="en"

def install_program(app, runtime):
    connection=runtime["connection"]
    now=runtime["now"]
    account=runtime["account"]
    persist=runtime["persist"]
    transition=runtime["transition"]
    get_record=runtime["get_record"]

    def entity_db(db):
        db.execute("CREATE TABLE IF NOT EXISTS program_entities(kind TEXT NOT NULL,id TEXT NOT NULL,body TEXT NOT NULL,PRIMARY KEY(kind,id))")
    def all_entities(kind,db=None):
        if db is not None:
            entity_db(db)
            return [json.loads(r[0]) for r in db.execute("SELECT body FROM program_entities WHERE kind=?",(kind,))]
        with connection() as db:
            return all_entities(kind,db)
    def put(kind,eid,body,db=None):
        if db is not None:
            entity_db(db)
            db.execute("INSERT INTO program_entities(kind,id,body) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET body=excluded.body",(kind,eid,json.dumps(body,ensure_ascii=False)))
        else:
            with connection() as db:put(kind,eid,body,db)
        return body
    def store_media(data,filename,user,content_type,pages):
        import base64
        mid=secrets.token_hex(16)
        put("media",mid,{"id":mid,"owner":user["id"],"filename":filename,"contentType":content_type,"data":base64.b64encode(data).decode(),"pages":pages,"at":now()})
        return mid
    def validate_media(ids,user):
        for mid in ids:
            media=next((m for m in all_entities("media") if m["id"]==mid),None)
            if not media or media["owner"]!=user["id"]:raise HTTPException(403,"Upload access denied")
        return ids
    runtime["store_media"]=store_media
    runtime["validate_media"]=validate_media
    def document_warnings(ids,user):
        validate_media(ids,user)
        return sorted({warning for media in all_entities('media') if media['id'] in ids for page in media.get('pages',[]) for warning in page.get('warnings',[])})
    runtime['document_warnings']=document_warnings


    @app.get("/api/media/{mid}")
    def media_file(mid:str,user=Depends(account)):
        import base64
        from fastapi.responses import Response
        media=next((m for m in all_entities("media") if m["id"]==mid),None)
        if not media:raise HTTPException(404,"File not found")
        allowed=media["owner"]==user["id"] or user["role"]=="admin"
        if user["role"]=="assessor":
            allowed=any(r.get("assessor")==user["id"] and mid in r.get("mediaIds",[]) and r["state"] not in ("DRAFT","EXTRACTED","PROVISIONALLY_SCORED","CLARIFICATION") for r in records())
        if not allowed:raise HTTPException(403,"File access denied")
        return Response(base64.b64decode(media["data"]),media_type=media["contentType"],headers={"Content-Disposition":"attachment; filename=original-upload","X-Content-Type-Options":"nosniff"})

    def admin(user):
        if user["role"]!="admin":raise HTTPException(403,"Admin account required")
    def audit(action,user,details):
        eid=secrets.token_hex(12)
        put("audit",eid,{"id":eid,"action":action,"actor":user["id"],"at":now(),"details":details})
    def records():
        with connection() as db:
            return [json.loads(r[0]) for r in db.execute("SELECT body FROM submissions ORDER BY rowid DESC")]
    def missing(record):
        return [key for key in CRITICAL if not record["facts"].get(key,{}).get("confirmed") or not record["facts"].get(key,{}).get("validation",{}).get("valid")]
    def invalidate(record):
        record.pop('guidance',None)
        record.pop('guidanceTranslations',None)
        for key in ["finalScore","report","reportTranslations","confirmedAt","businessPlan","businessPlanTranslations","assessorReview","recommendation","adminDecision"]:
            record.pop(key,None)
        if record.get("currentScore"):
            record["currentScore"]["stale"]=True
        record["updatedAt"]=now()

    def managed_auth(token):
        hashed=hashlib.sha256(token.encode()).hexdigest()
        for a in all_entities("account"):
            if secrets.compare_digest(a.get("tokenHash",""),hashed) and a.get("active",True):
                return {k:v for k,v in a.items() if k!="tokenHash"}
        return None
    runtime["managed_auth"]=managed_auth

    @app.get("/api/schema")
    def schema(user=Depends(account)):
        return {"modules":MODULES,"critical":CRITICAL,"recommendations":RECOMMENDATIONS,"decisions":DECISIONS}

    @app.get('/api/regions')
    def regions(user=Depends(account)):
        options={'Pune','Mumbai','Thane','Nashik','Ahmednagar','Solapur','Satara','Kolhapur','Sangli'}
        for capacity in all_entities('capacity'):
            options.update(value.strip() for value in capacity.get('regions',[]) if isinstance(value,str) and value.strip())
        for region in all_entities('region'):
            value=region.get('name') or region.get('id')
            if isinstance(value,str) and value.strip():options.add(value.strip())
        return sorted(options)

    @app.get("/api/profile")
    def profile(user=Depends(account)):
        existing=next((p for p in all_entities("profile") if p["id"]==user["id"]),None)
        return existing or {"id":user["id"],"name":user.get("name",user["id"]),"preferred_language":"en"}

    @app.post("/api/profile")
    def save_profile(req:ProfileRequest,user=Depends(account)):
        if req.preferred_language not in runtime["LANGUAGES"]:raise HTTPException(422,"Unsupported language")
        existing=next((p for p in all_entities("profile") if p["id"]==user["id"]),{})
        changes=req.model_dump(exclude_unset=True)
        if "cohortId" in changes and changes["cohortId"]!=existing.get("cohortId") and user["role"]!="admin" and existing.get("cohortId"):
            raise HTTPException(403,"Admin must authorize cohort transfers")
        if req.cohortId and not any(c["id"]==req.cohortId for c in all_entities("cohort")):
            raise HTTPException(422,"Cohort does not exist")
        result={**existing,**changes,"id":user["id"],"updatedAt":now()}
        put("profile",user["id"],result)
        return result

    @app.post("/api/pipeline/process-structured")
    def structured(req:StructuredRequest,user=Depends(account)):
        if user["role"]!="beneficiary":raise HTTPException(403,"Beneficiary account required")
        if req.language not in runtime["LANGUAGES"]:raise HTTPException(422,"Unsupported language")
        if set(req.fields)-set(FIELDS):raise HTTPException(422,"Unknown business form field ID")
        if req.cohortId and not any(c["id"]==req.cohortId for c in all_entities("cohort")):raise HTTPException(422,"Unknown cohort")
        facts={}
        sources=[]
        for key in FIELDS:
            value=req.fields.get(key)
            if value:
                source_id="form:"+key
                payload=value.model_dump()
                # Explicit form metadata is beneficiary supplied, never inferred.
                quote=value.value
                sources.append({"id":source_id,"original":quote,"english":quote if req.language=="en" else "","language":req.language,"detectedLanguage":req.language,"translationUncertain":False,"method":"BENEFICIARY_FORM","metadata":payload})
                facts[key]={"field":key,"value":quote,"status":"PROVIDED","claims":[{"value":quote,"evidence":quote,"source_id":source_id,"amount":value.amount,"currency":value.currency,"unit":value.unit,"period":value.period,"costBasis":value.costBasis}],"validation":{"valid":True,"errors":[]},"confirmed":False,"method":"BENEFICIARY_FORM","isEstimate":value.estimate}
            else:
                facts[key]={"field":key,"value":None,"status":"MISSING","claims":[],"validation":{"valid":False,"errors":[]},"confirmed":False}
        record={"id":secrets.token_hex(16),"owner":user["id"],"assessor":user.get("assessor_id"),"title":req.title,"language":req.language,"cohortId":req.cohortId,"region":req.region,"trade":req.trade,"inputType":"structured","sources":sources,"facts":facts,"questions":[],"state":"EXTRACTED","history":[{"state":"DRAFT","at":now()},{"state":"EXTRACTED","at":now()}],"createdAt":now(),"revision":0,"maxQuestions":8,"assessmentVersions":[]}
        apply_category(record)
        record["currentScore"]=score(facts)
        record["currentScore"]["assessmentType"]="EVIDENCE_COVERAGE_NOT_AI_RATING"
        record["provisionalScore"]=record["currentScore"]
        return persist(record,True)

    @app.post("/api/submissions/{sid}/fields")
    def update_fields(sid:str,req:StructuredRequest,user=Depends(account)):
        record=get_record(sid,user,True)
        runtime["editable"](record)
        if set(req.fields)-set(FIELDS):raise HTTPException(422,"Unknown form field")
        if 'region' in req.model_fields_set:record['region']=req.region.strip()
        if not req.fields:return persist(record)
        record.setdefault("factHistory",[]).append({"at":now(),"actor":user["id"],"before":copy.deepcopy(record["facts"])})
        for key,value in req.fields.items():
            payload=value.model_dump()
            source_id="form:"+key+":"+secrets.token_hex(4)
            record["sources"].append({"id":source_id,"original":value.value,"english":value.value if req.language=="en" else "","language":req.language,"method":"BENEFICIARY_FORM","metadata":payload,"correctsField":key})
            record["facts"][key]={"field":key,"value":value.value,"status":"PROVIDED","claims":[{"value":value.value,"evidence":value.value,"source_id":source_id,"amount":value.amount,"currency":value.currency,"unit":value.unit,"period":value.period,"costBasis":value.costBasis}],"validation":{"valid":True,"errors":[]},"confirmed":False,"method":"BENEFICIARY_FORM","isEstimate":value.estimate}
        apply_category(record)
        invalidate(record)
        transition(record,"EXTRACTED")
        return persist(record)

    @app.post("/api/submissions/{sid}/confirm-fields")
    def confirm_fields(sid:str,req:ConfirmFields,user=Depends(account)):
        record=get_record(sid,user,True)
        runtime["editable"](record)
        if any(k not in record["facts"] for k in req.fields+req.rejected):raise HTTPException(422,"Unknown field")
        if set(req.fields)&set(req.rejected):raise HTTPException(422,"A field cannot be both confirmed and rejected")
        before={k:dict(record["facts"][k]) for k in req.fields+req.rejected}
        for key in req.fields:
            fact=record["facts"][key]
            if fact["status"]!="PROVIDED" or not fact["validation"]["valid"]:raise HTTPException(422,"Only validated provided fields can be confirmed")
            fact["confirmed"]=True
            fact["confirmedAt"]=now()
        for question in record['questions']:
            field=question['field']
            if question['status']=='unknown' and field in req.fields and record['facts'][field].get('method')=='BENEFICIARY_FORM':
                question.update(status='answered',answer=record['facts'][field]['value'],resolvedByConfirmedForm=True,evidenceSourceId=record['facts'][field]['claims'][0]['source_id'])
        for key in req.rejected:
            record["facts"][key].update({"confirmed":False,"status":"UNCLEAR","value":None})
        record.setdefault("factHistory",[]).append({"at":now(),"actor":user["id"],"before":before,"confirmed":req.fields,"rejected":req.rejected})
        apply_category(record)
        invalidate(record)
        record["currentScore"]=score({k:{**f,"validation":{**f["validation"],"valid":f.get("confirmed",False) and f["validation"]["valid"]}} for k,f in record["facts"].items()})
        record["currentScore"]["assessmentType"]="EVIDENCE_COVERAGE_NOT_AI_RATING"
        record["financials"]=financials(record["facts"])
        record["criticalMissing"]=missing(record)
        transition(record,"PROVISIONALLY_SCORED")
        return persist(record)

    @app.post("/api/submissions/{sid}/display")
    async def display(sid:str,user=Depends(account)):
        record=get_record(sid,user,True)
        language=record["language"]
        for key,fact in record["facts"].items():
            if not fact.get("value"):continue
            source=next((s for s in record["sources"] if any(c["source_id"]==s["id"] for c in fact.get("claims",[]))),None)
            source_lang=fact.get("processingLanguage") or (source.get("language","en") if fact.get("method")=="BENEFICIARY_FORM" and source else "en")
            fact.setdefault("displayValues",{})[language]=await runtime["IndicTransService"].translate(fact["value"],source_lang,language) if key not in ("overview.businessName","overview.proposedLocation") else fact["value"]
        return persist(record)

    @app.get("/api/submissions/{sid}/financials")
    def finances(sid:str,user=Depends(account)):
        return financials(get_record(sid,user)["facts"])

    @app.post("/api/submissions/{sid}/ai-score")
    async def ai_score(sid:str,user=Depends(account)):
        record=get_record(sid,user,True)
        from services.beneficiary_experience import normalize_form_facts
        await normalize_form_facts(record)
        runtime["editable"](record)
        runtime["require_resolved_answers"](record)
        if missing(record):raise HTTPException(409,"Complete and confirm the required business facts before assessment")
        confirmed={k:f for k,f in record["facts"].items() if f.get("confirmed") and f["validation"]["valid"]}
        if not confirmed:raise HTTPException(409,"Confirm supported business information first")
        class Rating(BaseModel):
            model_config=ConfigDict(extra="forbid")
            domain:str
            rating:float=Field(ge=0,le=5,allow_inf_nan=False)
            fields:list[str]
            explanation:str
        class Ratings(BaseModel):
            model_config=ConfigDict(extra="forbid")
            ratings:list[Rating]
        raw=await QwenService.generate("Rate all eight domains from 0 to 5 using only supplied CONFIRMED information. Explain each rating and list the supporting field IDs. No supporting field means rating zero. Never infer facts, demand, profitability or readiness. Suggestions are not evidence. Assess the original pitch together with clarification answers. A vague or unsupported answer must not improve a rating. Use only fields belonging to each domain. Missing domain evidence limits the maximum rating proportionally.",{"facts":confirmed,"originalPitch":[{"id":s["id"],"text":s.get("english","")} for s in record["sources"] if s["id"]=="pitch"],"clarificationAnswers":[{"field":q["field"],"question":q["text"],"answer":q.get("answer"),"evidence":next((s.get("english") for s in record["sources"] if s["id"]==q["id"]),None)} for q in record["questions"] if q["status"]=="answered"],"rubric":DEFAULT_RUBRIC,"financials":financials(record["facts"])},Ratings.model_json_schema())
        ratings=Ratings.model_validate(raw).ratings
        if len(ratings)!=8 or {r.domain for r in ratings}!=set(DEFAULT_RUBRIC):raise ValueError("Model returned an incomplete eight-domain assessment")
        domains={}
        total=0
        for rating in ratings:
            domain_fields=DEFAULT_RUBRIC[rating.domain][1]
            if any(k not in domain_fields for k in rating.fields):raise ValueError("Model used evidence from a different assessment category")
            if any(k not in confirmed for k in rating.fields) or (rating.rating>0 and not rating.fields):raise ValueError("Model rating lacks confirmed evidence")
            weight=DEFAULT_RUBRIC[rating.domain][0]
            rating.rating=min(rating.rating,5*len(set(rating.fields))/len(domain_fields))
            total+=rating.rating*weight*2
            domains[rating.domain]={"weight":weight,"rating":rating.rating,"supportedFields":rating.fields,"missingFields":[k for k in DEFAULT_RUBRIC[rating.domain][1] if k not in confirmed],"explanation":rating.explanation,"evidence":[confirmed[k]["claims"] for k in rating.fields]}
        critical=missing(record)
        result={**score({key:{**fact,"validation":{**fact["validation"],"valid":bool(fact.get("confirmed") and fact["validation"]["valid"])}} for key,fact in record["facts"].items()}),"overallScore":round(total,2),"domains":domains,"assessmentType":"QWEN_EVIDENCE_RATING","status":"PROVISIONAL" if critical else "FINAL","criticalMissing":critical,"scoreMeaning":"Qwen evidence-backed domain assessment; not an investment approval","at":now(),"version":len(record.get("assessmentVersions",[]))+1,"factRevision":record["revision"],"threshold":7}
        record.setdefault("assessmentVersions",[]).append(result)
        record["currentScore"]=result
        record["criticalMissing"]=critical
        result["status"]="PROVISIONAL"
        if not critical:transition(record,"PROVISIONALLY_SCORED")
        return persist(record)

    runtime["rate_record"]=ai_score

    @app.post("/api/submissions/{sid}/escalate")
    async def escalate(sid:str,req:Reason,user=Depends(account)):
        record=get_record(sid,user,True)
        if record["language"]!="en":
            for src in record["sources"]:
                if not src.get("english"):
                    src["english"]=await runtime["IndicTransService"].translate(src["original"],src["language"],"en")
        record["clarificationReason"]=req.reason
        record["criticalMissing"]=missing(record)
        record.pop("finalScore",None)
        transition(record,"CLARIFICATION_REQUIRED")
        persist(record)
        allocate(record,user)
        return get_record(sid,user)

    def allocate(record,user,requested=None,reason="Automatic assignment"):
        with connection() as db:
            db.execute("BEGIN IMMEDIATE")
            rows=[json.loads(r[0]) for r in db.execute("SELECT body FROM submissions")]
            settings=all_entities("capacity",db)
            accounts=[a for a in all_entities("account",db) if a["role"]=="assessor" and a.get("active",True)]
            environment=json.loads(runtime["os"].getenv("SCREENING_ACCOUNTS","{}"))
            if runtime["presentation_request"].get():environment={}
            accounts += [a for a in environment.values() if a["role"]=="assessor" and not any(b["id"]==a["id"] for b in accounts)]
            candidates=[]
            for assessor in accounts:
                cfg=next((s for s in settings if s["id"]==assessor["id"]),{"id":assessor["id"],"maximum":8,"preferred":8,"available":True,"regions":[],"trades":[]})
                effective=min(cfg.get("maximum",0),cfg.get("preferred",0))
                active=sum(r.get("assessor")==assessor["id"] and not r.get("adminDecision") and r["id"]!=record["id"] for r in rows)
                if requested and assessor["id"]!=requested:continue
                if not cfg.get("available",True) or effective<=active:continue
                if cfg.get("regions") and record.get("region") not in cfg["regions"]:continue
                if cfg.get("trades") and record.get("trade") not in cfg["trades"]:continue
                candidates.append((active/effective,active,assessor["id"]))
            assignment=min(candidates)[2] if candidates else None
            current=next((r for r in rows if r["id"]==record["id"]),None)
            if not current:raise HTTPException(404,"Submission not found")
            current["assessor"]=assignment
            current["assignmentStatus"]="ASSIGNED" if assignment else "PENDING_CAPACITY"
            current.setdefault("assignmentHistory",[]).append({"at":now(),"assessor":assignment,"actor":user["id"],"reason":reason})
            current["revision"]+=1
            db.execute("UPDATE submissions SET assessor=?,revision=?,body=? WHERE id=?",(assignment,current["revision"],json.dumps(current,ensure_ascii=False),current["id"]))
        audit("CASE_ASSIGNED",user,{"submission":record["id"],"assessor":assignment,"reason":reason})
        return current
    runtime["allocate"]=allocate
    runtime["critical_missing"]=missing

    @app.post("/api/admin/submissions/{sid}/assign")
    def assign(sid:str,req:AssignRequest,user=Depends(account)):
        admin(user)
        return allocate(get_record(sid,user),user,req.assessor_id,req.reason)

    @app.post("/api/submissions/{sid}/recommendation")
    async def recommend(sid:str,req:Recommendation,user=Depends(account)):
        record=get_record(sid,user)
        if user["role"]!="assessor" or record.get("assessor")!=user["id"]:raise HTTPException(403,"Assigned assessor required")
        if req.recommendation not in RECOMMENDATIONS:raise HTTPException(422,"Unknown recommendation")
        if record.get("adminDecision"):raise HTTPException(409,"Admin decision already recorded")
        if missing(record) and req.recommendation!="FURTHER_MENTORING_REQUIRED":raise HTTPException(409,"Critical information is incomplete; request further mentoring")
        if req.recommendation in ("BUSINESS_LAUNCH_READY","INVESTMENT_READINESS_REVIEW_RECOMMENDED") and (record.get("currentScore",{}).get("assessmentType")!="QWEN_EVIDENCE_RATING" or record.get("currentScore",{}).get("stale")):
            raise HTTPException(409,"A current evidence-backed AI assessment is required before a readiness recommendation")
        current=record.get("currentScore",{}).get("domains",{})
        if req.overrides and (any(k not in current or not 0<=v<=5 for k,v in req.overrides.items())):raise HTTPException(422,"Invalid score override")
        result={**req.model_dump(),"assessor":user["id"],"at":now(),"feedbackTranslated":await runtime["IndicTransService"].translate(req.reason,"en",record["language"])}
        if req.overrides:
            result["humanWeightedScore"]=round(2*sum(req.overrides.get(k,d["rating"])*d["weight"] for k,d in current.items()),2)
        record["recommendation"]=result
        record.setdefault("recommendationHistory",[]).append(result)
        transition(record,"ADMIN_REVIEW")
        persist(record)
        audit("ASSESSOR_RECOMMENDATION",user,{"submission":sid,"recommendation":req.recommendation})
        return record

    @app.post("/api/admin/submissions/{sid}/decision")
    async def decide(sid:str,req:Decision,user=Depends(account)):
        admin(user)
        record=get_record(sid,user)
        if record["state"]!="ADMIN_REVIEW" or not record.get("recommendation"):raise HTTPException(409,"Assessor recommendation must precede Admin decision")
        if req.decision not in DECISIONS:raise HTTPException(422,"Unknown decision")
        result={**req.model_dump(),"admin":user["id"],"at":now(),"explanationTranslated":await runtime["IndicTransService"].translate(req.reason,"en",record["language"]),"scope":"Internal program recommendation only; no funding disbursement"}
        record.setdefault("decisionHistory",[]).append(result)
        record["adminDecision"]=result
        state={"APPROVE_RECOMMENDATION":"PROGRAM_DECIDED","RETURN_FOR_CLARIFICATION":"AWAITING_BENEFICIARY","RETURN_FOR_MENTORING":"MENTORING_REQUIRED","REJECT_WITH_REASON":"PROGRAM_DECIDED"}[req.decision]
        transition(record,state)
        persist(record)
        audit("ADMIN_DECISION",user,{"submission":sid,**result})
        return record

    @app.post("/api/submissions/{sid}/request-clarification")
    async def request_clarification(sid:str,req:Reason,user=Depends(account)):
        record=get_record(sid,user)
        if user["role"]!="assessor":raise HTTPException(403,"Assigned assessor required")
        translated=await runtime["IndicTransService"].translate(req.reason,"en",record["language"])
        record.setdefault("humanQuestions",[]).append({"id":secrets.token_hex(8),"question":req.reason,"translated":translated,"at":now(),"assessor":user["id"],"status":"pending"})
        transition(record,"AWAITING_BENEFICIARY")
        return persist(record)

    @app.post("/api/submissions/{sid}/human-answer")
    def human_answer(sid:str,req:TaskUpdate,user=Depends(account)):
        record=get_record(sid,user,True)
        q=next((q for q in record.get("humanQuestions",[]) if q["id"]==req.task_id),None)
        if not q:raise HTTPException(404,"Clarification not found")
        q.update({"answer":req.evidence,"status":"answered","answeredAt":now()})
        transition(record,"CLARIFICATION_REQUIRED")
        return persist(record)

    @app.get("/api/admin/overview")
    def overview(user=Depends(account)):
        admin(user)
        cases=records()
        groups={}
        for dimension in ["cohortId","trade","region","assessor","state"]:
            grouped={}
            for r in cases:
                key=r.get(dimension) or "Unassigned"
                group=grouped.setdefault(key,{"name":key,"count":0,"scores":[],"approved":0,"recommendations":0})
                group["count"]+=1
                score_value=r.get("currentScore",{})
                if score_value.get("assessmentType")=="QWEN_EVIDENCE_RATING" and not score_value.get("stale"):group["scores"].append(score_value["overallScore"])
                group["approved"]+=int(r.get("adminDecision",{}).get("decision")=="APPROVE_RECOMMENDATION")
                group["recommendations"]+=int(bool(r.get("recommendation")))
            groups[dimension]=[{**v,"averageScore":round(sum(v["scores"])/len(v["scores"]),2) if v["scores"] else None} for v in grouped.values()]
        return {"records":cases,"groups":groups,"cohorts":all_entities("cohort"),"capacities":all_entities("capacity"),"profiles":all_entities("profile"),"accounts":[{k:v for k,v in a.items() if k!="tokenHash"} for a in all_entities("account")],"audit":all_entities("audit"),"counts":{"submissions":len(cases),"adminApproved":sum(r.get("adminDecision",{}).get("decision")=="APPROVE_RECOMMENDATION" for r in cases),"recommendations":sum(bool(r.get("recommendation")) for r in cases)}}

    @app.post("/api/admin/entities/{kind}")
    def save_entity(kind:str,req:EntityRequest,user=Depends(account)):
        admin(user)
        if kind not in ("cohort","capacity","settings"):raise HTTPException(422,"Unsupported entity")
        if kind=="cohort":
            if req.data.get("status","ACTIVE") not in ["ACTIVE","CLOSED","ARCHIVED"]:raise HTTPException(422,"Invalid cohort status")
        if kind=="capacity":
            for key in ["maximum","preferred"]:
                if not isinstance(req.data.get(key),int) or not 0<=req.data[key]<=1000:raise HTTPException(422,"Capacity must be an integer from 0 to 1000")
        result=put(kind,req.id,{**req.data,"id":req.id,"updatedAt":now()})
        audit("ENTITY_UPDATED",user,{"kind":kind,"id":req.id})
        return result

    @app.post("/api/assessor/capacity")
    def own_capacity(req:EntityRequest,user=Depends(account)):
        if user["role"]!="assessor" or req.id!=user["id"]:raise HTTPException(403,"Own assessor settings only")
        existing=next((c for c in all_entities("capacity") if c["id"]==user["id"]),{"id":user["id"],"maximum":8,"preferred":8,"available":True})
        preferred=req.data.get("preferred",existing["preferred"])
        if not isinstance(preferred,int) or preferred<0 or preferred>1000:raise HTTPException(422,"Invalid preferred capacity")
        existing.update({"preferred":preferred,"available":bool(req.data.get("available",True))})
        return put("capacity",user["id"],existing)

    @app.post("/api/admin/accounts")
    def create_account(req:AccountRequest,user=Depends(account)):
        admin(user)
        if req.role not in ["beneficiary","assessor","admin"]:raise HTTPException(422,"Invalid role")
        if any(a["id"]==req.id for a in all_entities("account")):raise HTTPException(409,"Account already exists")
        token=secrets.token_urlsafe(32)
        put("account",req.id,{**req.model_dump(),"tokenHash":hashlib.sha256(token.encode()).hexdigest(),"active":True,"createdAt":now()})
        audit("ACCOUNT_CREATED",user,{"id":req.id,"role":req.role})
        return {"id":req.id,"role":req.role,"token":token,"notice":"Shown once; keep private"}

    @app.post("/api/admin/submissions/{sid}/cohort")
    def transfer(sid:str,req:EntityRequest,user=Depends(account)):
        admin(user)
        if not any(c["id"]==req.id for c in all_entities("cohort")):raise HTTPException(404,"Cohort not found")
        record=get_record(sid,user)
        record.setdefault("cohortHistory",[]).append({"from":record.get("cohortId"),"to":req.id,"at":now(),"admin":user["id"],"reason":req.data.get("reason","")})
        record["cohortId"]=req.id
        return persist(record)

    @app.get("/api/cohorts")
    def cohorts(user=Depends(account)):
        return all_entities("cohort")

    @app.post("/api/clarification/{sid}/round")
    async def question_round(sid:str,user=Depends(account)):
        from services.screening import Question
        record=get_record(sid,user,True)
        from services.beneficiary_experience import normalize_form_facts
        await normalize_form_facts(record)
        runtime["editable"](record)
        if runtime["unresolved_answers"](record):return record
        attempted={q["field"] for q in record["questions"]}
        candidates=[]
        for domain,(_,fields) in DEFAULT_RUBRIC.items():
            if any(q["field"] in fields for q in record["questions"]):continue
            eligible=[key for key in fields if key not in attempted]
            if eligible:candidates.append(next((key for key in eligible if not record["facts"].get(key,{}).get("confirmed")),eligible[0]))
        category_questions=bool(candidates)
        if not candidates:candidates=[k for k,f in record["facts"].items() if k!="overview.trade" and (not f.get("confirmed") or f["status"]!="PROVIDED") and k not in attempted]
        count=min(5,len(candidates)) if category_questions else min(5,len(candidates),max(0,max(8,record.get("maxQuestions",8))-len(record["questions"])))
        candidates=candidates[:count]
        if not count:return record
        record["maxQuestions"]=max(record.get("maxQuestions",8),len(record["questions"])+count)
        class Batch(BaseModel):
            questions:list[Question]
        result=Batch.model_validate(await QwenService.generate("Generate exactly the requested count of distinct contextual clarification questions for this actual business. Select eligible field IDs only. Explain each question in simple English. Never supply invented answers, financial numbers or assumptions.",{"count":count,"eligibleFields":candidates,"facts":record["facts"],"sources":record["sources"],"previousQuestions":record["questions"]},Batch.model_json_schema()))
        if len(result.questions)!=count or len({q.field for q in result.questions})!=count or set(q.field for q in result.questions)!=set(candidates):raise ValueError("Question round contains repeated or unsupported fields")
        for q in result.questions:
            question={**q.model_dump(),"id":secrets.token_hex(8),"status":"pending","translations":{},"localizedGuidance":{},"localizedRationale":{}}
            for source_key,target_key in [("text","translations"),("guidance","localizedGuidance"),("rationale","localizedRationale")]:
                question[target_key][record["language"]]=await runtime["IndicTransService"].translate(question[source_key],"en",record["language"])
            record["questions"].append(question)
        transition(record,"CLARIFICATION")
        return persist(record)

    @app.post("/api/submissions/{sid}/business-plan")
    async def business_plan(sid:str,user=Depends(account)):
        record=get_record(sid,user,True)
        confirmed={k:f for k,f in record["facts"].items() if f.get("confirmed") and f["validation"]["valid"]}
        if not confirmed:raise HTTPException(409,"Confirm business information before generating a plan")
        # A grounded plan remains useful even without a model: every non-placeholder
        # factual paragraph below is taken directly from a confirmed source value.
        sections={
            "Executive summary":["overview.businessName","overview.productService"],
            "Business idea and problem":["overview.productService","market.customerProblem"],
            "Product or service":["overview.productService"],
            "Target customers":["market.targetCustomers"],
            "Market and competitors":["market.demandEvidence","market.competition"],
            "Unique selling proposition":["market.differentiation"],
            "Marketing and customer acquisition":["market.salesChannels"],
            "Operations and resources":["operations.rawMaterials","operations.equipment","operations.suppliers","operations.staffing","operations.capacity"],
            "Startup investment":["finance.initialInvestment","finance.availableCapital"],
            "Monthly costs and revenue":["finance.monthlyExpenses","finance.expectedSales","finance.revenueAssumptions"],
            "Profit and break-even scenarios":[],
            "Risks and mitigation":["risk.marketRisks","risk.financialRisks","risk.operationalRisks","risk.mitigation","risk.compliance"],
            "Funding and use of funds":["finance.requestedFunding","finance.fundingSources"],
            "Business launch roadmap":[],
            "Mentoring recommendations":[],
            "Missing information and assumptions":[],
        }
        plan={}
        references={}
        for title,keys in sections.items():
            plan[title]="\n".join(confirmed[k]["value"] for k in keys if k in confirmed) or "To be confirmed"
            references[title]=[k for k in keys if k in confirmed]
        plan["Missing information and assumptions"]="To be confirmed: "+", ".join(k for k in FIELDS if k not in confirmed)
        record["businessPlan"]={"sections":plan,"references":references,"generatedAt":now(),"method":"CONFIRMED_FACT_COMPILATION","language":"en","financials":financials(record["facts"]),"sourceRevision":record["revision"]}
        # Non-English structured input must be normalized before an English plan is
        # presented; preserve source values and require actual translation.
        if record["language"]!="en":
            if any(s.get("method")=="BENEFICIARY_FORM" and not s.get("english") for s in record["sources"]):
                for title,body in list(plan.items()):
                    if references[title]:plan[title]=await runtime["IndicTransService"].translate(body,record["language"],"en")
            translated={title:await runtime["IndicTransService"].translate(body,"en",record["language"]) for title,body in plan.items()}
            record["businessPlanTranslations"]={record["language"]:{**record["businessPlan"],"sections":translated,"language":record["language"]}}
        return persist(record)

    @app.post("/api/submissions/{sid}/business-plan/edit")
    def edit_plan(sid:str,req:PlanEdit,user=Depends(account)):
        record=get_record(sid,user,True)
        if not record.get("businessPlan"):raise HTTPException(409,"Generate a plan first")
        record.setdefault("planHistory",[]).append({"at":now(),"before":copy.deepcopy(record["businessPlan"])})
        if set(req.sections)-set(record["businessPlan"]["sections"]):raise HTTPException(422,"Unknown plan section")
        record["businessPlan"]["sections"].update(req.sections)
        record["businessPlan"]["method"]="BENEFICIARY_EDITED_DRAFT_NOT_VALIDATED_FACTS"
        record.pop("businessPlanTranslations",None)
        return persist(record)

    @app.post("/api/submissions/{sid}/roadmap")
    async def roadmap(sid:str,user=Depends(account)):
        record=get_record(sid,user,True)
        class Task(BaseModel):
            title:str
            reason:str
            instruction:str
            evidenceNeeded:str
            day:int=Field(ge=1,le=30)
            field:str
        class Tasks(BaseModel):
            tasks:list[Task]=Field(min_length=3,max_length=10)
        result=Tasks.model_validate(await QwenService.generate("Generate a specific 30-day entrepreneurship mentoring roadmap for this actual business. Target missing facts and weak domains. Suggested activities are hypotheses, not facts. Never invent market evidence. Use eligible field IDs only.",{"facts":record["facts"],"weakDomains":record.get("currentScore",{}),"eligibleFields":FIELDS},Tasks.model_json_schema()))
        tasks=[]
        for task in result.tasks:
            if task.field not in FIELDS:raise ValueError("Roadmap references an unknown field")
            item={**task.model_dump(),"id":secrets.token_hex(8),"status":"pending"}
            item["localized"]={k:await runtime["IndicTransService"].translate(item[k],"en",record["language"]) for k in ["title","reason","instruction","evidenceNeeded"]}
            tasks.append(item)
        record["roadmap"]=tasks
        return persist(record)

    @app.post("/api/submissions/{sid}/roadmap/evidence")
    def task_evidence(sid:str,req:TaskUpdate,user=Depends(account)):
        record=get_record(sid,user,True)
        task=next((t for t in record.get("roadmap",[]) if t["id"]==req.task_id),None)
        if not task:raise HTTPException(404,"Task not found")
        task.update({"status":"evidence_submitted","evidence":req.evidence,"submittedAt":now()})
        return persist(record)

    @app.get("/api/submissions/{sid}/local-insights")
    def insights(sid:str,user=Depends(account)):
        record=get_record(sid,user)
        return {"status":"LIVE_DATA_UNAVAILABLE","message":"Live local market data unavailable","knownCompetitors":record["facts"].get("market.competition"),"checklist":["Identify comparable businesses in your area and record their public sources.","Interview potential customers without assuming demand.","Compare your documented offer with observed alternatives.","Treat underserved needs as hypotheses to validate."]}
