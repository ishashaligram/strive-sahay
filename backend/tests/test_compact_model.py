import asyncio
from services.qwen_service import QwenService
from services.screening import extract

def test_compact_claims_still_require_source_evidence(monkeypatch):
    monkeypatch.setenv('QWEN_MODEL','local-business-1.5b')
    async def generate(system,data,schema):
        if 'Verify field-to-evidence mapping' in system:
            return {'checks':[{'id':c['id'],'supported':True} for c in data['candidates']]}
        return {'claims':[
            {'field':'overview.productService','value':'I sell uniforms','source_id':'pitch','uncertain':False},
            {'field':'finance.initialInvestment','value':'50000','source_id':'pitch','uncertain':False}]}
    monkeypatch.setattr(QwenService,'generate',generate)
    facts=asyncio.run(extract([{'id':'pitch','english':'I sell uniforms','original':'I sell uniforms'}]))
    assert facts['overview.productService']['value']=='I sell uniforms'
    assert facts['finance.initialInvestment']['value'] is None
    assert not facts['finance.initialInvestment']['validation']['valid']
