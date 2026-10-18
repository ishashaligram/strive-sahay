"""Live model smoke test; prints validation outcomes, not submitted user data."""
import asyncio,os,sys,time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
os.environ.update(QWEN_PROVIDER='openai',QWEN_ENDPOINT='http://127.0.0.1:8080/v1',QWEN_MODEL='local-business-1.5b',AI_TIMEOUT='180')
from services.qwen_service import QwenService
from services.screening import extract,Question
async def main():
    start=time.time()
    if '--questions-only' not in sys.argv:
        facts=await extract([{'id':'pitch','english':'I run a tailoring business making school uniforms in Pune. My customers are local schools. I have two sewing machines.','original':'I run a tailoring business making school uniforms in Pune. My customers are local schools. I have two sewing machines.','language':'en'}])
        assert facts['overview.productService']['status']=='PROVIDED',facts['overview.productService']
        assert facts['finance.initialInvestment']['value'] is None
        print('LIVE extraction passed; seconds:',round(time.time()-start,1),flush=True)
    question=Question.model_validate(await QwenService.generate('Ask one contextual clarification question in English for the specified field. Return that exact field ID. Do not invent facts.',{'field':'finance.initialInvestment','business':'school uniform tailoring in Pune'},Question.model_json_schema()))
    assert question.field=='finance.initialInvestment'
    print('LIVE contextual question:',question.text,flush=True)
    from pydantic import BaseModel
    class Batch(BaseModel):
        questions:list[Question]
    fields=['finance.initialInvestment','market.demandEvidence','risk.marketRisks']
    batch=Batch.model_validate(await QwenService.generate('Generate exactly three distinct contextual business questions. Use each eligible field ID exactly once. Use English. Do not suggest answers.',{'eligibleFields':fields,'count':3,'business':'school uniform tailoring in Pune'},Batch.model_json_schema()))
    assert len(batch.questions)==3 and {q.field for q in batch.questions}==set(fields)
    print('LIVE multi-category question batch passed',flush=True)
asyncio.run(main())
