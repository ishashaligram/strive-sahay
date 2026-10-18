"""Human-reviewed programme readiness, independent of funding disbursement."""
from typing import Literal
from pydantic import BaseModel,Field
from fastapi import Depends,HTTPException

class ReadinessLimits(BaseModel):
    minimumScore:float=Field(default=7,ge=0,le=10)
    trainingPercent:float=Field(default=70,ge=0,le=100)
    mentoringPercent:float=Field(default=70,ge=0,le=100)

class ProgressEntry(BaseModel):
    kind:Literal['training','mentoring']
    percent:float=Field(ge=0,le=100)
    reviewerName:str=Field(min_length=2,max_length=160)
    feedback:str=Field(min_length=5,max_length=4000)

class InvestmentDecision(BaseModel):
    decision:Literal['ELIGIBLE_FOR_FUNDING_REVIEW','RETURN_FOR_IMPROVEMENT']
    reason:str=Field(min_length=5,max_length=4000)

def readiness(record,limits):
    progress=record.get('programmeProgress',[])
    latest={kind:next((p for p in reversed(progress) if p['kind']==kind),None) for kind in ('training','mentoring')}
    score=record.get('finalScore') or {}
    valid_score=bool(score.get('assessmentType')=='QWEN_EVIDENCE_RATING' and score.get('status')=='FINAL' and not score.get('stale') and not record.get('synthetic'))
    gaps=[]
    if not valid_score:gaps.append('Complete a current final assessment with confirmed business facts.')
    elif score.get('overallScore',0)<limits['minimumScore']:gaps.append('Assessment score is below the programme limit.')
    for kind,key in [('training','trainingPercent'),('mentoring','mentoringPercent')]:
        if not latest[kind] or latest[kind]['percent']<limits[key]:gaps.append(f'{kind.capitalize()} progress has not reached the programme limit.')
    if record.get('recommendation',{}).get('recommendation')!='INVESTMENT_READINESS_REVIEW_RECOMMENDED':gaps.append('Assigned assessor must recommend investment readiness review.')
    if record.get('adminDecision',{}).get('decision') in ('REJECT_WITH_REASON','RETURN_FOR_CLARIFICATION','RETURN_FOR_MENTORING'):gaps.append('Resolve the existing administrator decision before investment review.')
    saved=record.get('investmentReview')
    status='READY_FOR_ADMIN_REVIEW' if not gaps else 'NEEDS_IMPROVEMENT'
    if saved and saved['decision']=='RETURN_FOR_IMPROVEMENT':status='RETURNED_FOR_IMPROVEMENT'
    elif saved and not gaps and saved.get('caseRevision')==record.get('revision') and saved.get('limits')==limits:status=saved['decision']
    return {'score':score.get('overallScore') if valid_score else None,'training':latest['training'],'mentoring':latest['mentoring'],'gaps':gaps,'meetsLimits':not gaps,'status':status,'decision':saved}

def install_investment_review(app,runtime):
    account=runtime['account'];get_record=runtime['get_record'];persist=runtime['persist'];now=runtime['now'];entities=runtime['program_entities'];put=runtime['put_program_entity'];audit=runtime['program_audit']
    def admin(user):
        if user['role']!='admin':raise HTTPException(403,'Administrator required')
    def limits():return next((ReadinessLimits.model_validate(e).model_dump() for e in entities('settings') if e['id']=='investment-readiness'),ReadinessLimits().model_dump())
    @app.get('/api/admin/investment-readiness')
    def overview(user=Depends(account)):
        admin(user)
        import json
        with runtime['connection']() as db:records=[json.loads(r[0]) for r in db.execute('SELECT body FROM submissions ORDER BY rowid DESC')]
        names={a['id']:a.get('name',a['id']) for a in entities('account')}
        settings=limits()
        return {'limits':settings,'beneficiaries':[{'id':r['id'],'owner':r['owner'],'name':names.get(r['owner'],r.get('syntheticBeneficiary',r['owner'])),'title':r['title'],'cohortId':r.get('cohortId'),'assessor':r.get('assessor'),'state':r['state'],'synthetic':r.get('synthetic',False),'progressHistory':r.get('programmeProgress',[]),**readiness(r,settings)} for r in records]}
    @app.post('/api/admin/investment-readiness/limits')
    def save_limits(req:ReadinessLimits,user=Depends(account)):
        admin(user);result=put('settings','investment-readiness',{'id':'investment-readiness',**req.model_dump(),'at':now(),'actor':user['id']});audit('INVESTMENT_LIMITS_UPDATED',user,req.model_dump());return result
    @app.post('/api/submissions/{sid}/programme-progress')
    def progress(sid:str,req:ProgressEntry,user=Depends(account)):
        if user['role'] not in ('admin','assessor'):raise HTTPException(403,'Assigned assessor or administrator required')
        record=get_record(sid,user)
        if user['role']=='assessor' and record.get('assessor')!=user['id']:raise HTTPException(403,'Assigned assessor required')
        record.setdefault('programmeProgress',[]).append({**req.model_dump(),'recordedBy':user['id'],'recordedRole':user['role'],'at':now()})
        result=persist(record);audit('PROGRAMME_PROGRESS_RECORDED',user,{'submission':sid,**req.model_dump()});return result
    @app.post('/api/admin/submissions/{sid}/investment-review')
    def decision(sid:str,req:InvestmentDecision,user=Depends(account)):
        admin(user);record=get_record(sid,user);settings=limits();result=readiness(record,settings)
        if req.decision=='ELIGIBLE_FOR_FUNDING_REVIEW' and not result['meetsLimits']:raise HTTPException(409,{'message':'Readiness requirements are incomplete','gaps':result['gaps']})
        record['investmentReview']={**req.model_dump(),'actor':user['id'],'at':now(),'limits':settings,'caseRevision':record['revision']+1,'scope':'Internal eligibility for funding review; no funding approval or disbursement.'}
        saved=persist(record);audit('INVESTMENT_REVIEW_RECORDED',user,{'submission':sid,**req.model_dump()});return readiness(saved,settings)
