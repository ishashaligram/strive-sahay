from test_workflow import client,models,AUTH
from test_program import form
import main
from services.indictrans_service import IndicTransService

def test_language_change_translates_staff_feedback_without_changing_originals(client,models,monkeypatch):
    record=form(client)
    record['sources']=[{'id':'pitch','original':'मला शिवणकामाचा व्यवसाय सुरू करायचा आहे.','english':'I want to start a tailoring business.','language':'mr'}]
    record['recommendation']={'reason':'Interview five customers.'}
    record['adminDecision']={'reason':'Complete mentoring first.'}
    record['programmeProgress']=[{'kind':'mentoring','feedback':'Practice pricing your products.'}]
    record['roadmap']=[{'id':'task1','title':'Meet customers','instruction':'Ask about their needs.','reason':'Validate demand.','evidenceNeeded':'Interview notes.'}]
    record['humanQuestions']=[{'id':'q1','question':'Where will you sell?','status':'pending'}]
    main.persist(record)
    calls=[]
    async def translate(text,source,target):
        calls.append((source,target));return text if source==target else target+': '+text
    monkeypatch.setattr(IndicTransService,'translate',translate)
    for language in ('mr','ta','en'):
        response=client.post('/api/submissions/'+record['id']+'/language',headers=AUTH,json={'language':language})
        assert response.status_code==200,response.text
        changed=response.json()
        expected='Interview five customers.' if language=='en' else language+': Interview five customers.'
        assert changed['recommendation']['feedbackTranslations'][language]==expected
        assert changed['roadmap'][0]['translations'][language]['instruction']
        assert changed['humanQuestions'][0]['translations'][language]
        assert changed['sources'][0]['original']==record['sources'][0]['original']
        assert changed['sources'][0]['english']=='I want to start a tailoring business.'
        assert changed['recommendation']['reason']=='Interview five customers.'
