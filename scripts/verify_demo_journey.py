"""Real-model API journey using isolated temporary demo records, never production seeds."""
import os,sys,tempfile,json,time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from fastapi.testclient import TestClient
import main

VALUES={
 'overview.productService':'School uniforms and garment repairs',
 'overview.proposedLocation':'Pune',
 'market.targetCustomers':'Local schools and parents',
 'market.customerProblem':'Parents need locally available uniforms with alterations',
 'market.demandEvidence':'Ten parents requested uniform quotations',
 'market.salesChannels':'Direct school visits and shop orders',
 'market.competition':'Two existing uniform shops in the neighbourhood',
 'market.differentiation':'Alterations and measured fittings are included',
 'finance.initialInvestment':'INR 10000 startup investment',
 'finance.unitCost':'INR 60 per garment',
 'finance.sellingPrice':'INR 100 per garment',
 'finance.monthlyExpenses':'INR 1000 monthly fixed costs',
 'finance.expectedSales':'100 garments per month',
 'operations.equipment':'Two sewing machines',
 'operations.suppliers':'Local textile wholesalers',
 'operations.capacity':'100 garments per month',
 'operations.skills':'Three years of tailoring experience',
 'operations.staffing':'One trained tailoring assistant',
 'risk.marketRisks':'School orders may fluctuate outside the school-opening season',
 'risk.financialRisks':'Customers may pay late',
 'risk.operationalRisks':'A sewing machine may break down',
 'risk.mitigation':'Maintain spare machine parts and request advance payments',
 'risk.compliance':'Check shop registration requirements with the local authority',
}
def main_test():
    with tempfile.TemporaryDirectory(prefix='strive-live-test-') as temp:
        os.environ['DATABASE_PATH']=str(Path(temp)/'real.sqlite3')
        os.environ['DEMO_DATABASE_PATH']=str(Path(temp)/'demo.sqlite3')
        os.environ['PRESENTATION_PHONE_LOGIN']='true'
        client=TestClient(main.app,raise_server_exceptions=False)
        def call(path,body=None,auth=None):
            start=time.time()
            headers={'Authorization':'Bearer '+auth} if auth else {}
            r=client.get(path,headers=headers) if body is None else client.post(path,json=body,headers=headers)
            if r.status_code!=200:raise AssertionError(f'{path}: HTTP {r.status_code}: {r.text[:300]}')
            print(json.dumps({'route':path,'status':r.status_code,'seconds':round(time.time()-start,1)}),flush=True)
            return r.json()
        accounts={}
        for index,role in enumerate(('beneficiary','assessor','admin')):
            challenge=call('/api/auth/request-otp',{'phone':'987650000'+str(index),'role':role,'mode':'register','name':'Isolated live test '+role,'language':'en'})
            accounts[role]=call('/api/auth/verify-otp',{'challenge_id':challenge['challenge_id'],'otp':challenge['demo_otp']})
        b,a,d=[accounts[role]['session_token'] for role in ('beneficiary','assessor','admin')]
        pitch='I sell school uniforms. My business is in Pune. My customers are local schools. My initial investment is INR 10000.'
        record=call('/api/pipeline/process-text',{'title':'Isolated live verification','text':pitch,'language':'en'},b)
        assert record['facts']['overview.productService']['value']
        sid=record['id']
        fields={key:{'value':value} for key,value in VALUES.items()}
        for key,amount in [('finance.initialInvestment',10000),('finance.unitCost',60),('finance.sellingPrice',100),('finance.monthlyExpenses',1000),('finance.expectedSales',100)]:fields[key]['amount']=amount
        for key in ['finance.initialInvestment','finance.unitCost','finance.sellingPrice','finance.monthlyExpenses']:fields[key]['currency']='INR'
        for key in ['finance.unitCost','finance.sellingPrice','finance.expectedSales']:fields[key]['unit']='garment'
        fields['finance.monthlyExpenses'].update(period='month',costBasis='fixed')
        fields['finance.expectedSales'].update(period='month',estimate=True)
        record=call(f'/api/submissions/{sid}/fields',{'title':record['title'],'language':'en','fields':fields},b)
        record=call(f'/api/submissions/{sid}/confirm-fields',{'fields':list(fields)},b)
        for batch in range(3):
            record=call(f'/api/clarification/{sid}/round',{},b)
            pending=[q for q in record['questions'] if q['status']=='pending']
            if not pending:break
            for q in pending:
                answer=VALUES[q['field']]
                record=call(f'/api/clarification/{sid}/answer',{'question_id':q['id'],'answer':answer,'language':'en'},b)
                assert next(x for x in record['questions'] if x['id']==q['id'])['status']=='answered','Relevant answer rejected'
                record=call(f'/api/submissions/{sid}/confirm-fields',{'fields':[q['field']]},b)
            if not main.pending_assessment_domains(record):break
        assert not main.pending_assessment_domains(record)
        record=call(f'/api/submissions/{sid}/finalize',{},b)
        assert record['finalScore']['assessmentType']=='QWEN_EVIDENCE_RATING'
        call(f'/api/submissions/{sid}/business-plan',{},b)
        if record['finalScore']['overallScore']>=7:
            call(f'/api/submissions/{sid}/confirm',{},b)
            record=call(f'/api/submissions/{sid}/submit-to-assessor',{},b)
        else:record=call(f'/api/submissions/{sid}/escalate',{'reason':'Please review the weak evidence and recommend mentoring.'},b)
        assert record.get('assessor')==accounts['assessor']['user']['id']
        assert any(r['id']==sid for r in call('/api/submissions',auth=a))
        call(f'/api/submissions/{sid}/recommendation',{'recommendation':'FURTHER_MENTORING_REQUIRED','reason':'Validate school demand and document the business costs before launch.'},a)
        result=call(f'/api/admin/submissions/{sid}/decision',{'decision':'APPROVE_RECOMMENDATION','reason':'Approve the mentoring pathway; this is not a funding approval.'},d)
        assert result['state']=='PROGRAM_DECIDED'
        assert call(f'/api/submissions/{sid}',auth=b)['adminDecision']['decision']=='APPROVE_RECOMMENDATION'
        print('LIVE END-TO-END JOURNEY PASSED; all test records were temporary.',flush=True)
if __name__=='__main__':main_test()
