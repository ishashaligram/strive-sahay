import pytest
from test_workflow import client,AUTH,ASSESSOR
from test_program import form,grant_admin,ADMIN
from services.investment_review import readiness

def test_limits_and_progress_require_authorised_staff(client,monkeypatch):
    grant_admin(monkeypatch)
    assert client.get('/api/admin/investment-readiness',headers=AUTH).status_code==403
    assert client.post('/api/admin/investment-readiness/limits',headers=ADMIN,json={'minimumScore':11}).status_code==422
    response=client.post('/api/admin/investment-readiness/limits',headers=ADMIN,json={'minimumScore':8,'trainingPercent':80,'mentoringPercent':75})
    assert response.status_code==200
    record=form(client)
    assert client.post('/api/submissions/'+record['id']+'/escalate',headers=AUTH,json={'reason':'Need training and mentoring review.'}).status_code==200
    url='/api/submissions/'+record['id']+'/programme-progress'
    update={'kind':'training','percent':85,'reviewerName':'Test trainer','feedback':'Completed sessions with practice evidence.'}
    assert client.post(url,headers=AUTH,json=update).status_code==403
    assert client.post(url,headers={'Authorization':'Bearer other-assessor'},json=update).status_code==403
    assert client.post(url,headers=ASSESSOR,json=update).status_code==200
    rows=client.get('/api/admin/investment-readiness',headers=ADMIN).json()
    assert rows['limits']['minimumScore']==8
    row=next(r for r in rows['beneficiaries'] if r['id']==record['id'])
    assert row['training']['percent']==85 and row['training']['recordedBy']=='a1'
    assert not row['meetsLimits'] and row['gaps']
    decision='/api/admin/submissions/'+record['id']+'/investment-review'
    assert client.post(decision,headers=ADMIN,json={'decision':'ELIGIBLE_FOR_FUNDING_REVIEW','reason':'Please approve this case.'}).status_code==409
    assert client.post(decision,headers=ADMIN,json={'decision':'RETURN_FOR_IMPROVEMENT','reason':'Complete mentoring and the final assessment.'}).status_code==200

def ready_record():
    return {'revision':1,'finalScore':{'assessmentType':'QWEN_EVIDENCE_RATING','status':'FINAL','overallScore':8},'programmeProgress':[{'kind':'training','percent':90},{'kind':'mentoring','percent':80}],'recommendation':{'recommendation':'INVESTMENT_READINESS_REVIEW_RECOMMENDED'}}

LIMITS={'minimumScore':7,'trainingPercent':70,'mentoringPercent':70}

def test_readiness_recalculates_and_synthetic_scores_never_qualify():
    record=ready_record()
    assert readiness(record,LIMITS)['meetsLimits']
    assert not readiness(record,{**LIMITS,'minimumScore':9})['meetsLimits']
    record['synthetic']=True
    assert not readiness(record,LIMITS)['meetsLimits']
    record.pop('synthetic');record['finalScore']['stale']=True
    assert not readiness(record,LIMITS)['meetsLimits']

def test_old_eligibility_requires_review_after_case_or_limits_change():
    record=ready_record()
    record['investmentReview']={'decision':'ELIGIBLE_FOR_FUNDING_REVIEW','caseRevision':1,'limits':LIMITS}
    assert readiness(record,LIMITS)['status']=='ELIGIBLE_FOR_FUNDING_REVIEW'
    record['revision']=2
    assert readiness(record,LIMITS)['status']=='READY_FOR_ADMIN_REVIEW'
    assert readiness(record,{**LIMITS,'minimumScore':7.5})['status']=='READY_FOR_ADMIN_REVIEW'

def test_admin_records_eligible_review_and_progress_change_requires_new_review(client,monkeypatch):
    import main
    grant_admin(monkeypatch)
    record=form(client)
    record.update(ready_record())
    # Preserve optimistic revision from the actual persisted case.
    current=client.get('/api/submissions/'+record['id'],headers=AUTH).json()
    record['revision']=current['revision']
    main.persist(record)
    endpoint='/api/admin/submissions/'+record['id']+'/investment-review'
    decision={'decision':'ELIGIBLE_FOR_FUNDING_REVIEW','reason':'Reviewed training evidence and assessor recommendation.'}
    assert client.post(endpoint,headers=ASSESSOR,json=decision).status_code==403
    result=client.post(endpoint,headers=ADMIN,json=decision)
    assert result.status_code==200,result.text
    assert result.json()['status']=='ELIGIBLE_FOR_FUNDING_REVIEW'
    assert client.post('/api/submissions/'+record['id']+'/programme-progress',headers=ADMIN,json={'kind':'mentoring','percent':40,'reviewerName':'Test mentor','feedback':'New review found substantial unfinished activities.'}).status_code==200
    assert client.post(endpoint,headers=ADMIN,json=decision).status_code==409
