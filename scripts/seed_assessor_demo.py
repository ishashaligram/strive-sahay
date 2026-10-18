"""Append fictional analysis cases to existing presentation assessors; never touch live DB."""
import sys,json,copy,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from services.phone_auth import demo_connection
from seed_synthetic_demo import seed
import main

def seed_assessors():
    seed()
    inserted=0
    with demo_connection() as db:
        assessors=[json.loads(r[0]) for r in db.execute("SELECT body FROM program_entities WHERE kind='account'") if json.loads(r[0]).get('role')=='assessor' and json.loads(r[0]).get('active',True)]
        templates=[json.loads(r[0]) for r in db.execute("SELECT body FROM submissions WHERE id LIKE 'synthetic-demo-case-%'")]
        for assessor in assessors:
            for index,template in enumerate(templates):
                if template.get('assessor')==assessor['id']:continue
                record=copy.deepcopy(template)
                sid='synthetic-assessor-'+hashlib.sha256((assessor['id']+template['id']).encode()).hexdigest()[:24]
                record.update({'id':sid,'assessor':assessor['id'],'state':['SUBMITTED','ADMIN_REVIEW','PROGRAM_DECIDED','CLARIFICATION_REQUIRED','AWAITING_BENEFICIARY'][index%5],'assignmentStatus':'ASSIGNED','revision':1,'synthetic':True,'demoTemplate':template['id'],'createdAt':main.now(),'updatedAt':main.now()})
                # Separate fictional owner IDs keep each demonstration case distinct.
                record['owner']='synthetic-owner-'+sid
                record['history']=[{'state':record['state'],'at':main.now()}]
                record['assignmentHistory']=[{'assessor':assessor['id'],'actor':'synthetic-seeder','at':main.now(),'reason':'Explicitly requested fictional assessor analysis example'}]
                if record.get('recommendation'):record['recommendation']['assessor']=assessor['id']
                for q in record.get('questions',[]):q['id']=sid+'-'+q['field']
                record['programmeProgress']=[{'kind':kind,'percent':max(20,95-index*15-(5 if kind=='mentoring' else 0)),'reviewerName':'Synthetic '+kind+' reviewer','feedback':'Fictional progress example: '+('Completed practice sessions; validate real customer demand.' if index<2 else 'More practice and cost records are needed before review.'),'recordedBy':'synthetic-seeder','recordedRole':'demo','at':main.now()} for kind in ('training','mentoring')]
                if record['state']=='AWAITING_BENEFICIARY':record['humanQuestions']=[{'id':sid+'-follow-up','question':'What evidence supports your expected monthly orders?','translated':'What evidence supports your expected monthly orders?','translations':{'en':'What evidence supports your expected monthly orders?'},'status':'pending','at':main.now(),'assessor':assessor['id']}]
                inserted+=db.execute('INSERT OR IGNORE INTO submissions VALUES(?,?,?,?,?,?)',(sid,record['owner'],record['assessor'],record['state'],1,json.dumps(record))).rowcount
    print(f'Added {inserted} fictional assessor cases. Reruns do not duplicate cases; existing records are unchanged.')
if __name__=='__main__':seed_assessors()
