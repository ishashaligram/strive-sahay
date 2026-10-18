from fastapi.testclient import TestClient
import service_api

client = TestClient(service_api.app)

def test_ocr_rejects_non_pdf_before_model_processing():
    response = client.post('/ocr', files={'file': ('bad.pdf', b'not a PDF')})
    assert response.status_code == 415

def test_translation_failure_never_becomes_sample_text(monkeypatch):
    def unavailable(*args):
        raise RuntimeError('Approved model access required')
    monkeypatch.setattr(service_api, 'indic_translate', unavailable)
    response = client.post('/translate', json={'text': 'hello', 'source_language': 'eng_Latn', 'target_language': 'hin_Deva'})
    assert response.status_code == 503
    assert response.json()['detail'] == 'Approved model access required'

def test_translation_rejects_changed_quantities(monkeypatch):
    monkeypatch.setattr(service_api, 'indic_translate', lambda *args: '200')
    response = client.post('/translate', json={'text': '100', 'source_language': 'eng_Latn', 'target_language': 'hin_Deva'})
    assert response.status_code == 503
    assert 'numeric' in response.json()['detail']
