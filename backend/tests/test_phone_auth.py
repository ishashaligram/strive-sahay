"""Presentation OTP tests use isolated temporary databases. No SMS is sent."""
import sqlite3
import time
import pytest
from test_workflow import client, models, create, AUTH


@pytest.fixture(autouse=True)
def separate_demo_database(tmp_path,monkeypatch):
    monkeypatch.setenv('DEMO_DATABASE_PATH',str(tmp_path/'presentation.sqlite3'))
    monkeypatch.setenv('PRESENTATION_PHONE_LOGIN','true')


def register(client,role='beneficiary',phone='9876543210'):
    challenge=client.post('/api/auth/request-otp',json={'phone':phone,'role':role,'mode':'register','name':'Test '+role,'language':'en'})
    assert challenge.status_code==200,challenge.text
    payload=challenge.json()
    assert len(payload['demo_otp'])==6
    assert 'session_token' not in payload
    verified=client.post('/api/auth/verify-otp',json={'challenge_id':payload['challenge_id'],'otp':payload['demo_otp']})
    assert verified.status_code==200,verified.text
    return verified.json(),payload


def headers(user):return {'Authorization':'Bearer '+user['session_token']}


@pytest.mark.parametrize('role',['beneficiary','assessor','admin'])
def test_each_role_registers_verifies_and_logs_out(client,role):
    user,challenge=register(client,role)
    session=client.get('/api/session',headers=headers(user))
    assert session.status_code==200
    assert session.json()['role']==role
    assert session.json()['name']=='Test '+role
    reused=client.post('/api/auth/verify-otp',json={'challenge_id':challenge['challenge_id'],'otp':challenge['demo_otp']})
    assert reused.status_code==401
    assert client.post('/api/auth/logout',headers=headers(user),json={}).status_code==200
    assert client.get('/api/session',headers=headers(user)).status_code==401


def test_existing_phone_can_log_back_in_for_only_its_registered_role(client,monkeypatch):
    user,_=register(client)
    stamp=time.time()
    monkeypatch.setattr('services.phone_auth.time.time',lambda:stamp+31)
    challenge=client.post('/api/auth/request-otp',json={'phone':'+919876543210','role':'beneficiary','mode':'login'}).json()
    response=client.post('/api/auth/verify-otp',json={'challenge_id':challenge['challenge_id'],'otp':challenge['demo_otp']})
    assert response.status_code==200
    assert response.json()['user']['id']==user['user']['id']
    assert client.post('/api/auth/request-otp',json={'phone':'9876543210','role':'admin','mode':'login'}).status_code==404


def test_wrong_expired_and_overused_otps_are_rejected(client,monkeypatch):
    response=client.post('/api/auth/request-otp',json={'phone':'9876543210','role':'beneficiary','mode':'register','name':'Test'})
    challenge=response.json()
    wrong='000000' if challenge['demo_otp']!='000000' else '111111'
    for _ in range(5):assert client.post('/api/auth/verify-otp',json={'challenge_id':challenge['challenge_id'],'otp':wrong}).status_code==401
    assert client.post('/api/auth/verify-otp',json={'challenge_id':challenge['challenge_id'],'otp':challenge['demo_otp']}).status_code==429
    stamp=time.time()
    monkeypatch.setattr('services.phone_auth.time.time',lambda:stamp+301)
    assert client.post('/api/auth/verify-otp',json={'challenge_id':challenge['challenge_id'],'otp':challenge['demo_otp']}).status_code==401


def test_phone_validation_and_resend_limits(client):
    assert client.post('/api/auth/request-otp',json={'phone':'notaphone','role':'beneficiary','mode':'register','name':'Test'}).status_code==422
    challenge=client.post('/api/auth/request-otp',json={'phone':'9876543210','role':'beneficiary','mode':'register','name':'Test'})
    assert challenge.status_code==200
    assert client.post('/api/auth/request-otp',json={'phone':'9876543210','role':'beneficiary','mode':'register','name':'Test'}).status_code==429


def test_demo_admin_cannot_read_existing_real_records(client,models):
    real=create(client)
    manager,_=register(client,'admin')
    overview=client.get('/api/admin/overview',headers=headers(manager))
    assert overview.status_code==200,overview.text
    assert overview.json()['records']==[]
    assert client.get('/api/submissions/'+real['id'],headers=headers(manager)).status_code==404
    beneficiary,_=register(client)
    demo=client.post('/api/pipeline/process-structured',headers=headers(beneficiary),json={'title':'Demo idea','language':'en','fields':{'overview.productService':{'value':'Tailoring'}}})
    assert demo.status_code==200,demo.text
    assert len(client.get('/api/admin/overview',headers=headers(manager)).json()['records'])==1
    assert [r['id'] for r in client.get('/api/submissions',headers=AUTH).json()]==[real['id']]
    assert client.get('/api/admin/overview',headers=headers(beneficiary)).status_code==403


def test_hybrid_allocation_uses_demo_assessors_and_manager_override(client):
    assessor1,_=register(client,'assessor','9876543210')
    assessor2,_=register(client,'assessor','9876543211')
    beneficiary,_=register(client,'beneficiary')
    manager,_=register(client,'admin')
    record=client.post('/api/pipeline/process-structured',headers=headers(beneficiary),json={'title':'Test idea','language':'en','fields':{'overview.productService':{'value':'Tailoring'}}}).json()
    assigned=client.post('/api/submissions/'+record['id']+'/escalate',headers=headers(beneficiary),json={'reason':'Please help document the missing details.'})
    assert assigned.status_code==200,assigned.text
    first=assigned.json()['assessor']
    assert first in (assessor1['user']['id'],assessor2['user']['id'])
    target=assessor2['user']['id'] if first==assessor1['user']['id'] else assessor1['user']['id']
    changed=client.post('/api/admin/submissions/'+record['id']+'/assign',headers=headers(manager),json={'assessor_id':target,'reason':'Manager balances the mentoring workload.'})
    assert changed.status_code==200,changed.text
    assert changed.json()['assessor']==target
    assert changed.json()['assignmentHistory'][-1]['actor']==manager['user']['id']


def test_demo_and_real_database_paths_cannot_be_identical(client,monkeypatch,tmp_path):
    path=str(tmp_path/'shared.sqlite3')
    monkeypatch.setenv('DATABASE_PATH',path)
    monkeypatch.setenv('DEMO_DATABASE_PATH',path)
    result=client.post('/api/auth/request-otp',json={'phone':'9876543210','role':'beneficiary','mode':'register','name':'Test'})
    assert result.status_code==503
