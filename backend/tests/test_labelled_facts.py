import asyncio
from services.screening import extract
from services.qwen_service import QwenService

def test_labelled_answers_fill_fields_without_inventing_missing_values(monkeypatch):
    monkeypatch.setenv('QWEN_MODEL','local-business-1.5b')
    async def forbidden(*args):raise AssertionError('Explicit labels do not need model guesses')
    monkeypatch.setattr(QwenService,'generate',forbidden)
    text='[Question] What products or services do you provide?\n[Submitted answer] School uniforms\n[Question] Where will your business operate?\n[Submitted answer] Pune\n[Question] Who are your targeted customers?\n[Submitted answer] Local schools\n[Question] What is the expected revenue in a month?\n[Submitted answer] About Rs 45000 per month\n[Question] What is the selling price of your product?\n[Submitted answer] Do not know'
    facts=asyncio.run(extract([{'id':'pitch','english':text,'original':text}]))
    assert facts['overview.productService']['value']=='School uniforms'
    assert facts['overview.proposedLocation']['value']=='Pune'
    assert facts['market.targetCustomers']['value']=='Local schools'
    assert facts['finance.sellingPrice']['value'] is None
    assert facts['finance.revenueAssumptions']['reviewValue']=='About Rs 45000 per month'
    assert not facts['finance.revenueAssumptions']['validation']['valid']
    assert facts['finance.initialInvestment']['value'] is None

def test_narrative_location_does_not_replace_product(monkeypatch):
    monkeypatch.setenv('QWEN_MODEL','local-business-1.5b')
    text='I sell school uniforms. My business is in Pune. My customers are local schools. My initial investment is INR 10000.'
    facts=asyncio.run(extract([{'id':'pitch','english':text,'original':text}]))
    assert facts['overview.productService']['value']=='school uniforms'
    assert facts['overview.proposedLocation']['value']=='Pune'
    assert facts['finance.initialInvestment']['value']=='INR 10000'
    assert facts['finance.unitCost']['value'] is None
