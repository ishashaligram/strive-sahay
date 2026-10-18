"""Grounded beneficiary outputs and non-destructive reassessment attempts."""
import copy,secrets
from fastapi import Depends,HTTPException
from pydantic import BaseModel,Field,ConfigDict
from services.screening import FIELDS,DEFAULT_RUBRIC,score
from services.qwen_service import QwenService
from services.indictrans_service import IndicTransService

async def normalize_form_facts(record):
    for field,fact in record['facts'].items():
        if fact.get('method')!='BENEFICIARY_FORM' or fact.get('processingLanguage')=='en' or not fact.get('value'):continue
        source=next((s for s in record['sources'] if any(c['source_id']==s['id'] for c in fact.get('claims',[]))),None)
        if not source or source.get('language','en')=='en':continue
        language=source['language']
        english=source.get('english') or await IndicTransService.translate(source['original'],language,'en')
        source['english']=english
        fact.setdefault('displayValues',{})[language]=fact['value']
        fact['value']=english;fact['processingLanguage']='en'
        for claim in fact['claims']:claim['value']=english;claim['evidence']=english

def install_beneficiary_experience(app,runtime):
    account=runtime['account'];get_record=runtime['get_record'];persist=runtime['persist'];now=runtime['now']
    class ReadText(BaseModel):
        text:str=Field(min_length=1,max_length=1200)
        language:str
    @app.post('/api/speech/read')
    async def read_page(req:ReadText,user=Depends(account)):
        import httpx,os
        from services.indictrans_service import LANGUAGES
        if req.language not in LANGUAGES:raise HTTPException(422,'Unsupported language')
        async with httpx.AsyncClient(timeout=180) as client:
            response=await client.post(os.getenv('TTS_ENDPOINT','http://127.0.0.1:8001/tts'),json=req.model_dump())
            if response.status_code!=200:raise HTTPException(503,'Read-aloud is unavailable for this language. Please retry.')
            return response.json()
    async def localize(result,language):
        if language=='en':return copy.deepcopy(result)
        output={}
        for key,value in result.items():
            if isinstance(value,list):output[key]=[await IndicTransService.translate(item,'en',language) for item in value]
            else:output[key]=await IndicTransService.translate(value,'en',language)
        return output
    @app.post('/api/submissions/{sid}/guidance')
    async def guidance(sid:str,user=Depends(account)):
        record=get_record(sid,user,True)
        await normalize_form_facts(record)
        confirmed={key:fact for key,fact in record['facts'].items() if fact.get('confirmed') and fact['validation']['valid']}
        if not confirmed:raise HTTPException(409,'Review and confirm business details first')
        class Guidance(BaseModel):
            model_config=ConfigDict(extra='forbid')
            strengths:list[str]=Field(min_length=1,max_length=3)
            weaknesses:list[str]=Field(min_length=1,max_length=3)
            opportunities:list[str]=Field(min_length=1,max_length=3)
            threats:list[str]=Field(min_length=1,max_length=3)
            localMarketChecks:list[str]=Field(min_length=1,max_length=3)
            nextSteps:list[str]=Field(min_length=1,max_length=3)
        schema=Guidance.model_json_schema()
        for item in schema['properties'].values():item['items']['maxLength']=220
        output=Guidance.model_validate(await QwenService.generate('Create a simple SWOT and improvement guide. Use only confirmed facts for strengths and weaknesses. Opportunities and threats are hypotheses to validate, never verified market claims. Local market checks must be actions such as visiting shops or interviewing customers, not fabricated local prices or demand statistics. Never promise government funding. Use short plain English sentences.',{'facts':confirmed,'region':record.get('region'),'score':record.get('finalScore')},schema)).model_dump()
        record['guidance']={**output,'method':'QWEN_GROUNDED_GUIDANCE','localMarketStatus':'RESEARCH_TASKS_NOT_LIVE_MARKET_DATA','generatedAt':now()}
        record.setdefault('guidanceTranslations',{})[record['language']]=await localize(output,record['language'])
        return persist(record)

    @app.post('/api/submissions/{sid}/ai-business-plan')
    async def ai_plan(sid:str,user=Depends(account)):
        record=get_record(sid,user,True)
        await normalize_form_facts(record)
        confirmed={key:fact for key,fact in record['facts'].items() if fact.get('confirmed') and fact['validation']['valid']}
        if not confirmed:raise HTTPException(409,'Review and confirm business details first')
        headings=['Business summary','Customers and need','Products and pricing','How the business will work','Money and costs','Risks and next steps']
        schema={'type':'object','properties':{key:{'type':'string','maxLength':650} for key in headings},'required':headings,'additionalProperties':False}
        sections=await QwenService.generate('Write a short, simple business plan using only the confirmed facts. Do not invent financial numbers, customers, approvals, demand or suppliers. Explicitly say what is still unknown. Suggested actions must be clearly described as suggestions. This is an editable draft, not validated business evidence. Write in English.',{'facts':confirmed},schema)
        if set(sections)!=set(headings):raise ValueError('Business plan omitted a section')
        record['businessPlan']={'sections':sections,'method':'QWEN_GROUNDED_DRAFT','language':'en','generatedAt':now()}
        translated=await localize(sections,record['language'])
        record.setdefault('businessPlanTranslations',{})[record['language']]={**record['businessPlan'],'sections':translated,'language':record['language']}
        return persist(record)

    @app.post('/api/submissions/{sid}/reassess')
    def reassess(sid:str,user=Depends(account)):
        old=get_record(sid,user,True)
        if user['role']!='beneficiary':raise HTTPException(403,'Beneficiary account required')
        target=set()
        for domain,(_,fields) in DEFAULT_RUBRIC.items():
            if old.get('currentScore',{}).get('domains',{}).get(domain,{}).get('rating',0)<3.5:target.update(fields)
        target.update(key for key,fact in old['facts'].items() if not fact.get('confirmed') or not fact['validation']['valid'])
        if not target:target.update(DEFAULT_RUBRIC['financialViability'][1])
        record=copy.deepcopy(old)
        for key in ['finalScore','report','reportTranslations','businessPlan','businessPlanTranslations','guidance','guidanceTranslations','adminDecision','recommendation','assessorReview','submittedAt','confirmedAt','assessmentVersions','recommendationHistory','decisionHistory']:
            record.pop(key,None)
        record.update(id=secrets.token_hex(16),revision=0,state='EXTRACTED',questions=[],assessor=None,reassessmentOf=sid,previousScore=old.get('currentScore',{}).get('overallScore'),improvementFields=sorted(target),createdAt=now(),updatedAt=now(),history=[{'state':'EXTRACTED','at':now(),'reason':'New reassessment attempt; previous record preserved'}])
        for key in target:
            if key in record['facts']:record['facts'][key]['confirmed']=False
        record['currentScore']=score(record['facts'])
        record['currentScore']['assessmentType']='EVIDENCE_COVERAGE_NOT_AI_RATING'
        return persist(record,True)
