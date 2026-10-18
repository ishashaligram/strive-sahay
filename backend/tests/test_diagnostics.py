import asyncio,logging
from fastapi.testclient import TestClient
import main
from services.qwen_service import QwenService

def test_health_request_has_correlated_timing_without_query_values(caplog):
    with caplog.at_level(logging.INFO,logger='uvicorn.error'):
        response=TestClient(main.app).get('/api/health?private=do-not-log-this')
    rid=response.headers['x-request-id']
    assert response.status_code==200
    assert f'[API {rid}] END GET /api/health status=200 duration_ms=' in caplog.text
    assert 'do-not-log-this' not in caplog.text

def test_model_logs_duration_without_prompt_or_result(monkeypatch,caplog):
    async def generate(*args):return {'private':'private-model-output'}
    monkeypatch.setattr(QwenService,'_generate',generate)
    with caplog.at_level(logging.INFO,logger='uvicorn.error'):
        asyncio.run(QwenService.generate('Extract private-prompt',{'text':'private-user-input'},{}))
    assert 'stage=fact-extraction outcome=ok duration_ms=' in caplog.text
    assert 'private-user-input' not in caplog.text
    assert 'private-model-output' not in caplog.text
    assert 'private-prompt' not in caplog.text
