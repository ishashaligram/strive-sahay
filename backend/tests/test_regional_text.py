from test_workflow import client,models,AUTH
from services.indictrans_service import IndicTransService

def test_text_auto_uses_chosen_language_and_keeps_original(client,models,monkeypatch):
    calls=[]
    async def translate(text,source,target):
        calls.append((source,target));return 'I want to start a tailoring business in Pune.'
    monkeypatch.setattr(IndicTransService,'translate',translate)
    text='मला पुण्यात शिवणकामाचा व्यवसाय सुरू करायचा आहे.'
    result=client.post('/api/pipeline/process-text',headers=AUTH,json={'text':text,'language':'auto','interaction_language':'mr'})
    assert result.status_code==200,result.text
    record=result.json()
    assert record['sources'][0]['original']==text
    assert record['sources'][0]['language']=='mr'
    assert record['sources'][0]['english']=='I want to start a tailoring business in Pune.'
    assert record['language']=='mr' and ('mr','en') in calls

def test_ai_missing_fields_ignore_empty_placeholder_claims(client,monkeypatch):
    import asyncio
    from services.screening import extract,FIELDS
    from services.qwen_service import QwenService
    monkeypatch.setenv('QWEN_MODEL','test-full-schema')
    async def generate(system,data,schema):
        return {'facts':{key:{'status':'MISSING','claims':[{'value':'','evidence':'','source_id':'pitch','amount':None,'currency':None,'unit':None}]} for key in FIELDS}}
    monkeypatch.setattr(QwenService,'generate',generate)
    facts=asyncio.run(extract([{'id':'pitch','english':'I am considering a business.','original':'I am considering a business.','language':'en'}]))
    assert all(not fact['value'] and not fact['validation']['valid'] for fact in facts.values())

def test_compact_ai_empty_claims_are_missing_not_validation_errors(client,monkeypatch):
    import asyncio
    from services.screening import extract
    from services.qwen_service import QwenService
    monkeypatch.setenv('QWEN_MODEL','local-business-1.5b')
    async def generate(system,data,schema):
        return {'claims':[{'field':'finance.unitCost','value':'','source_id':'pitch','uncertain':False}]}
    monkeypatch.setattr(QwenService,'generate',generate)
    facts=asyncio.run(extract([{'id':'pitch','english':'A business idea.','original':'A business idea.','language':'en'}]))
    assert facts['finance.unitCost']['status']=='MISSING'
    assert not facts['finance.unitCost']['validation']['valid']

def test_explicit_start_business_anchors_keep_exact_values():
    from services.labelled_facts import narrative_answers
    source={'english':'I want to start a sewing business in Pune, my clients will be local schools.'}
    facts=narrative_answers(source)
    assert facts['overview.productService']=='sewing business'
    assert facts['overview.proposedLocation']=='Pune'
    assert facts['market.targetCustomers']=='local schools'
    assert all(value in source['english'] for value in facts.values())
    assert 'finance.initialInvestment' not in facts
