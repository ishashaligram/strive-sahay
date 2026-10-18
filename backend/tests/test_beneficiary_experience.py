import json
from test_workflow import client,models,AUTH
from test_program import form
from services.qwen_service import QwenService

def test_reassessment_creates_attempt_and_preserves_old_case(client,models):
    record=form(client);sid=record['id']
    response=client.post('/api/submissions/'+sid+'/reassess',headers=AUTH,json={})
    assert response.status_code==200,response.text
    new=response.json()
    assert new['id']!=sid and new['reassessmentOf']==sid
    assert new['improvementFields'] and not new.get('finalScore')
    assert new['questions']==[]
    assert client.get('/api/submissions/'+sid,headers=AUTH).json()['facts']==record['facts']
    assert client.post('/api/submissions/'+sid+'/reassess',headers={'Authorization':'Bearer other-beneficiary'},json={}).status_code==403

def test_guidance_is_labelled_research_and_plan_is_draft(client,models,monkeypatch):
    record=form(client);sid=record['id']
    async def generate(system,data,schema):
        if 'SWOT' in system:return {key:['Interview potential customers before assuming demand.'] for key in schema['properties']}
        return {key:'Confirmed facts only; remaining information needs review.' for key in schema['properties']}
    monkeypatch.setattr(QwenService,'generate',generate)
    guidance=client.post('/api/submissions/'+sid+'/guidance',headers=AUTH,json={})
    assert guidance.status_code==200,guidance.text
    assert guidance.json()['guidance']['localMarketStatus']=='RESEARCH_TASKS_NOT_LIVE_MARKET_DATA'
    plan=client.post('/api/submissions/'+sid+'/ai-business-plan',headers=AUTH,json={})
    assert plan.status_code==200,plan.text
    assert plan.json()['businessPlan']['method']=='QWEN_GROUNDED_DRAFT'
    assert len(plan.json()['businessPlan']['sections'])==6
