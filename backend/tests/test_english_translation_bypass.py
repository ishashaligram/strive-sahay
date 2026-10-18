import asyncio
import main
from services.qwen_service import QwenService
from services.indictrans_service import IndicTransService
import pytest

@pytest.mark.parametrize('language',['auto','en'])
def test_english_never_needs_detection_or_translation(monkeypatch,language):
    async def forbidden(*args,**kwargs):
        raise AssertionError('English must not call translation or language detection')
    monkeypatch.setattr(QwenService,'generate',forbidden)
    monkeypatch.setattr(IndicTransService,'translate',forbidden)
    text='Business idea: Tailoring & garment stitching. Investment: ₹50,000.\n[Table 1]'
    result=asyncio.run(main.source(text,language,'pitch'))
    assert result['english']==text and result['language']=='en'

def test_non_english_still_uses_translation(monkeypatch):
    calls=[]
    async def detect(*args):return {'language':'hi','uncertain':False,'mixed':False}
    async def translate(text,source,target):
        calls.append((source,target))
        return 'I sell clothes.'
    monkeypatch.setattr(QwenService,'generate',detect)
    monkeypatch.setattr(IndicTransService,'translate',translate)
    result=asyncio.run(main.source('मैं कपड़े बेचता हूँ।','auto','pitch'))
    assert result['english']=='I sell clothes.'
    assert calls==[('hi','en')]
