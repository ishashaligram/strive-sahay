"""Dataset scenario regression contracts. No sample answers are production defaults."""
import asyncio
import httpx
import pytest
from test_workflow import client, AUTH, claim, extraction
from services.document_layout import damaged_text,labelled_rows,overwritten_text
from services.screening import validate_facts,FIELDS
from services.indictrans_service import LANGUAGES,translate_mixed_to_english,numbers,IndicTransService
from services.category import apply_category


def test_same_ten_question_table_continues_on_next_page_without_header():
    context={}
    first=labelled_rows([['Q.No.','Questions','Response'],['1','Where will you start?','Pune'],['2','What will you sell?','Tailoring']],context)
    second=labelled_rows([['3','Who buys it?','Local families'],['4','Any survey?','']],context)
    assert first.count('[Question]')==2
    assert second.count('[Question]')==2
    assert '[Submitted answer] Local families' in second
    assert '[Answer state: EMPTY]' in second


def test_changed_questions_are_preserved_not_mapped_by_number():
    rows=[['Number','Question','Answer'],['1','What are your opening hours?','6 AM to 10 AM'],['2','What is the price?','INR 20']]
    result=labelled_rows(rows)
    assert '[Question] What are your opening hours?' in result
    assert '[Submitted answer] 6 AM to 10 AM' in result
    assert '[Question] What is the price?' in result


@pytest.mark.parametrize('value',['broken\x00text','bad \ufffd text','(cid:123) text'])
def test_broken_font_text_requires_ocr(value):assert damaged_text(value)


def test_struck_out_answers_need_visual_review():
    class Page:
        chars=[{'text':'A','x0':1,'x1':5,'top':0,'bottom':10},{'text':'B','x0':6,'x1':10,'top':0,'bottom':10}]
        lines=[{'x0':0,'x1':11,'top':5,'bottom':5}]
    assert overwritten_text(Page())


def test_overwritten_source_is_not_resolved_by_selecting_a_convenient_number():
    raw=extraction({'finance.sellingPrice':{'status':'PROVIDED','claims':[claim('INR 100',amount=100,currency='INR')]}})
    facts=validate_facts(raw,[{'id':'pitch','original':'INR 100 INR 200','english':'INR 100 INR 200','documentWarnings':['OVERWRITTEN_ANSWERS']}])
    assert facts['finance.sellingPrice']['value'] is None
    assert facts['finance.sellingPrice']['status']=='UNCLEAR'


def test_mixed_prompt_and_answer_languages_preserve_numbers(monkeypatch):
    calls=[]
    async def translate(text,source,target):
        calls.append(source)
        return text.replace('पुणे','Pune').replace('విజయవాడ','Vijayawada')
    monkeypatch.setattr(IndicTransService,'translate',translate)
    text='[Question] Where? [Submitted answer] पुणे 123. [Question] Price? [Submitted answer] విజయవాడ 456.'
    result=asyncio.run(translate_mixed_to_english(text,'mr'))
    assert 'Pune' in result and 'Vijayawada' in result
    assert '[Question] Where?' in result
    assert sorted(numbers(result))==sorted(numbers(text))
    assert set(calls)=={'mr','te'}


def test_odia_translation_digits_and_category_are_supported():
    assert LANGUAGES['or']=='ory_Orya'
    assert numbers('ମୂଲ୍ୟ ୬୦')==['60']
    record={'facts':{'overview.productService':{'value':'ସିଲେଇ ସେବା','status':'PROVIDED','validation':{'valid':True}}}}
    assert apply_category(record)['category']['status']=='DETECTED'
    assert 'operations.rawMaterials' in FIELDS and 'finance.fundingSources' in FIELDS


def test_mp4_odia_uses_real_gateway_contract_and_preserves_filename(client,monkeypatch):
    captured={}
    def post(url,**kwargs):
        captured.update(kwargs)
        return httpx.Response(200,json={'original_transcript':'ସିଲେଇ ସେବା','detected_language':'or','confidence':.9},request=httpx.Request('POST',url))
    monkeypatch.setenv('ASR_ENDPOINT','http://test-asr/transcribe')
    monkeypatch.setattr(httpx,'post',post)
    response=client.post('/api/pipeline/process-voice',headers=AUTH,data={'language':'or'},files={'file':('test.mp4',b'\x00\x00\x00\x18ftypmp42','video/mp4')})
    assert response.status_code==200,response.text
    assert captured['files']['file'][0]=='test.mp4'
    assert captured['data']['language']=='or'
    assert response.json()['reviewRequired']
    assert response.json()['original_transcript']=='ସିଲେଇ ସେବା'
