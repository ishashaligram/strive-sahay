from test_workflow import client,models,AUTH
from test_program import form

def test_region_only_edit_persists_without_changing_facts(client,models):
    record=form(client)
    path='/api/submissions/'+record['id']
    response=client.post(path+'/fields',headers=AUTH,json={'title':record['title'],'language':'en','region':'  Nashik  ','fields':{}})
    assert response.status_code==200
    saved=client.get(path,headers=AUTH).json()
    assert saved['region']=='Nashik'
    assert saved['facts']==record['facts']
    assert saved['state']==record['state']

def test_regions_are_available_to_logged_in_beneficiary(client):
    response=client.get('/api/regions',headers=AUTH)
    assert response.status_code==200
    assert 'Pune' in response.json() and 'Nashik' in response.json()
    assert client.get('/api/regions').status_code in (401,403)
