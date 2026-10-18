"""Real model smoke test for SWOT and plan; isolated temporary records."""
import os,sys,tempfile,json,time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from fastapi.testclient import TestClient
import main
with tempfile.TemporaryDirectory() as temp:
    os.environ['DATABASE_PATH']=str(Path(temp)/'test.sqlite3')
    os.environ['SCREENING_ACCOUNTS']=json.dumps({'isolated-test-token':{'id':'isolated-beneficiary','role':'beneficiary'}})
    c=TestClient(main.app,raise_server_exceptions=False)
    auth={'Authorization':'Bearer isolated-test-token'}
    r=c.post('/api/pipeline/process-structured',headers=auth,json={'title':'Isolated accessibility test','language':'en','fields':{'overview.productService':{'value':'School uniform tailoring'},'overview.proposedLocation':{'value':'Pune'},'market.targetCustomers':{'value':'Local schools'}}});assert r.status_code==200,r.text
    sid=r.json()['id'];keys=[key for key,fact in r.json()['facts'].items() if fact['value']]
    assert c.post(f'/api/submissions/{sid}/confirm-fields',headers=auth,json={'fields':keys}).status_code==200
    for suffix in ['guidance','ai-business-plan','reassess']:
        started=time.time();r=c.post(f'/api/submissions/{sid}/'+suffix,headers=auth,json={});assert r.status_code==200,r.text
        print(json.dumps({'route':suffix,'status':200,'seconds':round(time.time()-started,1)}),flush=True)
    print('Live SWOT, AI plan and reassessment passed with temporary records.',flush=True)
