import asyncio
from services.screening import extract_answer
from services.qwen_service import QwenService

def test_repeated_confirmed_answer_keeps_metadata_without_new_inference(monkeypatch):
    async def forbidden(*args):raise AssertionError('An identical confirmed answer needs no model re-extraction')
    monkeypatch.setattr(QwenService,'generate',forbidden)
    existing={'field':'finance.unitCost','value':'INR 60 per garment','status':'PROVIDED','confirmed':True,'validation':{'valid':True,'errors':[]},'claims':[{'value':'INR 60 per garment','evidence':'INR 60 per garment','source_id':'pitch','amount':60,'currency':'INR','unit':'garment'}]}
    source={'id':'answer1','english':existing['value'],'original':existing['value']}
    result=asyncio.run(extract_answer(source,'finance.unitCost',existing))
    assert result['claims'][0]['amount']==60
    assert result['claims'][0]['source_id']=='answer1'
    assert existing['claims'][0]['source_id']=='pitch'

def test_unrelated_new_answer_stays_unresolved(monkeypatch):
    async def unsupported(*args):return {'supported':False}
    monkeypatch.setattr(QwenService,'generate',unsupported)
    result=asyncio.run(extract_answer({'id':'answer1','english':'I like football','original':'I like football'},'finance.unitCost'))
    assert result['value'] is None
    assert not result['validation']['valid']
