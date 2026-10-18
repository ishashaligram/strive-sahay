"""Real PDF parsing plus explicit model doubles for semantic mapping checks."""
import asyncio
import pytest
from test_workflow import client, models, AUTH, extraction, claim
from services.category import apply_category
from services.pdf_service import PDFProcessingService
from services.screening import extract,validate_facts
from services.qwen_service import QwenService


def pdf_with_table():
    stream="""BT /F1 12 Tf 50 760 Td (Tailoring proposal) Tj ET
BT /F1 12 Tf 50 760 Td (Tailoring proposal) Tj ET
BT /F1 12 Tf 50 735 Td (Product: Tailoring) Tj ET
50 650 m 400 650 l S
50 670 m 400 670 l S
50 690 m 400 690 l S
50 710 m 400 710 l S
50 650 m 50 710 l S
250 650 m 250 710 l S
400 650 m 400 710 l S
BT /F1 12 Tf 60 697 Td (Description) Tj ET
BT /F1 12 Tf 260 697 Td (Amount) Tj ET
BT /F1 12 Tf 60 677 Td (Cost per garment) Tj ET
BT /F1 12 Tf 260 677 Td (INR 60) Tj ET
BT /F1 12 Tf 60 657 Td (Selling price) Tj ET
BT /F1 12 Tf 260 657 Td (INR 100) Tj ET
BT /F1 12 Tf 50 620 Td (Customers: local families) Tj ET""".encode()
    objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Count 1 /Kids [4 0 R] >>',b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>',b'<< /Length '+str(len(stream)).encode()+b' >>\nstream\n'+stream+b'\nendstream']
    result=bytearray(b'%PDF-1.4\n');offsets=[]
    for index,obj in enumerate(objects,1):
        offsets.append(len(result));result.extend(str(index).encode()+b' 0 obj\n'+obj+b'\nendobj\n')
    xref=len(result);result.extend(b'xref\n0 6\n0000000000 65535 f \n')
    for offset in offsets:result.extend(f'{offset:010d} 00000 n \n'.encode())
    result.extend(f'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF'.encode())
    return bytes(result)


def test_pdf_preserves_label_amount_rows_and_reading_order_without_duplicate_chars():
    result=PDFProcessingService.extract_text_from_pdf(pdf_with_table())
    text=result['full_text']
    assert text.count('Tailoring proposal')==1
    assert 'Cost per garment | INR 60' in text
    assert 'Selling price | INR 100' in text
    assert text.count('INR 60')==1
    assert text.index('Product: Tailoring')<text.index('Cost per garment')<text.index('Customers: local families')
    assert len(result['pages'][0]['tables'])==1


def test_a_real_quote_cannot_be_mapped_to_the_wrong_financial_field(monkeypatch):
    text='Selling price: INR 100 per garment.'
    raw=extraction({
      'finance.unitCost':{'status':'PROVIDED','claims':[claim('INR 100',text,amount=100,currency='INR')]},
      'finance.sellingPrice':{'status':'PROVIDED','claims':[claim('INR 100',text,amount=100,currency='INR')]},
    })
    source={'id':'pitch','original':text,'english':text}
    assert validate_facts(raw,[source])['finance.unitCost']['validation']['valid']
    async def generate(system,data,schema):
        if 'Verify field-to-evidence mapping' in system:
            return {'checks':[{'id':candidate['id'],'supported':candidate['field']=='finance.sellingPrice'} for candidate in data['candidates']]}
        return raw.model_dump()
    monkeypatch.setattr(QwenService,'generate',generate)
    facts=asyncio.run(extract([source]))
    assert facts['finance.unitCost']['value'] is None
    assert facts['finance.unitCost']['status']=='UNCLEAR'
    assert facts['finance.unitCost']['claims']==[]
    assert facts['finance.sellingPrice']['value']=='INR 100'


def test_incomplete_semantic_verification_fails_closed(monkeypatch):
    text='Tailoring service.'
    raw=extraction({'overview.productService':{'status':'PROVIDED','claims':[claim(text)]}})
    async def generate(system,data,schema):
        return {'checks':[]} if 'Verify field-to-evidence mapping' in system else raw.model_dump()
    monkeypatch.setattr(QwenService,'generate',generate)
    with pytest.raises(ValueError,match='every extracted claim'):
        asyncio.run(extract([{'id':'pitch','original':text,'english':text}]))


@pytest.mark.parametrize('text',['Tailoring for local families','सिलाई का व्यवसाय','शिवण व्यवसाय','దర్జీ సేవలు','தையல் சேவை','ಹೊಲಿಗೆ ಸೇವೆ','সেলাই ব্যবসা'])
def test_business_category_is_selected_from_product_in_each_language(text):
    record={'facts':{'overview.productService':{'value':text,'status':'PROVIDED','validation':{'valid':True}}}}
    apply_category(record)
    assert record['trade']=='Tailoring & Garment Manufacturing'
    assert record['category']['evidence']


@pytest.mark.parametrize('text',['I want to start a business.','Tailoring and pickle production'])
def test_vague_or_multiple_categories_are_not_guessed(text):
    record={'facts':{'overview.productService':{'value':text,'status':'PROVIDED','validation':{'valid':True}}}}
    apply_category(record)
    assert record['trade']==''
    assert record['category']['status']=='NEEDS_CLARIFICATION'


def test_structured_category_is_automatic_and_updates_when_product_changes(client):
    response=client.post('/api/pipeline/process-structured',headers=AUTH,json={'title':'Test idea','language':'en','trade':'Incorrect manual category','fields':{'overview.productService':{'value':'Tailoring for local customers'}}})
    assert response.status_code==200,response.text
    record=response.json()
    assert record['trade']=='Tailoring & Garment Manufacturing'
    changed=client.post('/api/submissions/'+record['id']+'/fields',headers=AUTH,json={'title':'Test idea','language':'en','fields':{'overview.productService':{'value':'Homemade pickle production'}}})
    assert changed.status_code==200,changed.text
    assert changed.json()['trade']=='Food Processing & Agro-Allied'
