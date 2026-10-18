"""Real NLLB + Qwen typed-pitch checks; only temporary synthetic records."""
import os,sys,tempfile,json,time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
import httpx
from fastapi.testclient import TestClient
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1]/'backend/.env',override=True)
import main
print('Using model: '+os.getenv('QWEN_MODEL','unset'),flush=True)
from services.indictrans_service import LANGUAGES
with tempfile.TemporaryDirectory() as temp:
    os.environ['DATABASE_PATH']=str(Path(temp)/'text-test.sqlite3')
    os.environ['SCREENING_ACCOUNTS']=json.dumps({'text-test-token':{'id':'synthetic-text-test','role':'beneficiary'}})
    client=TestClient(main.app,raise_server_exceptions=True)
    auth={'Authorization':'Bearer text-test-token'}
    for language,code in LANGUAGES.items():
        if language=='en':continue
        started=time.monotonic()
        with httpx.Client(timeout=180) as service:
            result=service.post('http://127.0.0.1:8001/translate',json={'text':'I want to start a tailoring business in Pune. My customers will be local schools.','source_language':'eng_Latn','target_language':code})
            result.raise_for_status();text=result.json()['translated_text']
        print(language+': testing typed pitch',flush=True)
        response=client.post('/api/pipeline/process-text',headers=auth,json={'title':'Synthetic regional text check','text':text,'language':'auto','interaction_language':language})
        assert response.status_code==200,response.text
        record=response.json();source=record['sources'][0]
        assert source['original']==text and source['language']==language and source['english'].strip()
        assert record['language']==language and record['facts'] and record['state']=='PROVISIONALLY_SCORED'
        assert any(f.get('value') and f.get('validation',{}).get('valid') for f in record['facts'].values()),'No supported facts were extracted for '+language
        print(language+': original preserved, English translated, supported facts returned ('+str(round(time.monotonic()-started,1))+'s)',flush=True)
    print('All seven typed-pitch pipeline checks passed. Temporary records removed.',flush=True)


