"""Unit/API tests use explicit model doubles. They are NOT live inference results."""
import asyncio
import copy
import json
import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import main
from services.screening import Extraction, FIELDS, validate_facts, score
from services.indictrans_service import IndicTransService
from services.qwen_service import QwenService

def extraction(claims=None):
    facts = {k: {"status": "MISSING", "claims": []} for k in FIELDS}
    facts.update(claims or {})
    return Extraction.model_validate({"facts": facts})

def claim(value, evidence=None, source_id="pitch", amount=None, currency=None, unit=None):
    return {"value": value, "evidence": evidence or value, "source_id": source_id, "amount": amount, "currency": currency, "unit": unit}

@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "screening.sqlite3"))
    monkeypatch.setenv("SCREENING_ACCOUNTS", json.dumps({
        "beneficiary-token": {"id": "b1", "role": "beneficiary", "assessor_id": "a1"},
        "other-beneficiary": {"id": "b2", "role": "beneficiary"},
        "assessor-token": {"id": "a1", "role": "assessor"},
        "other-assessor": {"id": "a2", "role": "assessor"},
    }))
    monkeypatch.setenv("MAX_QUESTIONS", "1")
    return TestClient(main.app, raise_server_exceptions=False)

AUTH = {"Authorization": "Bearer beneficiary-token"}
ASSESSOR = {"Authorization": "Bearer assessor-token"}

@pytest.fixture
def models(monkeypatch):
    calls = []
    async def generate(system, data, schema):
        calls.append((system, data))
        if "Rate all eight domains" in system:
            from services.screening import DEFAULT_RUBRIC
            return {"ratings":[{"domain":domain,"rating":4,"fields":list(data["facts"])[:1],"explanation":"Supported by the confirmed test source."} for domain in DEFAULT_RUBRIC]}
        if "Detect the language" in system:
            text = data["text"]
            lang = "mr" if "मी" in text else "hi" if "मैं" in text else "en"
            return {"language": lang, "uncertain": False, "mixed": "business" in text and lang != "en"}
        if "business fact extraction engine" in system:
            facts = {k: {"status": "MISSING", "claims": []} for k in FIELDS}
            source = data["sources"][0]
            value = source["english"]
            facts["overview.productService"] = {"status": "PROVIDED", "claims": [claim(value, source_id=source["id"])]}
            for s in data["sources"][1:]:
                facts["finance.initialInvestment"] = {"status": "PROVIDED", "claims": [claim(s["english"], source_id=s["id"])]}
            return {"facts": facts}
        if "question" in system.lower():
            field = data.get("field") or data["eligibleFields"][0]
            return {"field": field, "text": "What investment have you planned for this business?", "rationale": "The investment is not documented.", "guidance": "State your own plan, or say you do not know yet."}
        return {"strengths": ["A product is described."], "weaknesses": ["Financial details are incomplete."], "recommendations": ["Document your costs before making a decision."], "explanation": "This is an incomplete assessment, not a profitability conclusion."}
    async def translate(text, source, target):
        if source == target:
            return text
        if target == "en":
            return "I want a home business."
        return ("प्रश्न: " if target == "hi" else "प्रश्न आहे: ") + text
    monkeypatch.setattr(QwenService, "generate", generate)
    monkeypatch.setattr(IndicTransService, "translate", translate)
    return calls

def create(client, text="I want a tailoring business.", language="en"):
    response = client.post("/api/pipeline/process-text", headers=AUTH, json={"text": text, "language": language})
    assert response.status_code == 200, response.text
    return response.json()

def test_a_vague_pitch_leaves_finances_empty(client, models):
    record = create(client, "I want homemade pickle and masala products for local customers through social media.")
    assert all(f["value"] is None for k, f in record["facts"].items() if k.startswith("finance."))
    assert record["state"] == "PROVISIONALLY_SCORED"
    assert record["currentScore"]["unitContribution"] is None

def test_b_detailed_evidence_and_unit_contribution():
    text = "Investment INR 10000. Cost INR 65 per jar. Price INR 130 per jar. Pune."
    facts = extraction({
        "finance.initialInvestment": {"status": "PROVIDED", "claims": [claim("INR 10000", amount=10000, currency="INR")]},
        "finance.unitCost": {"status": "PROVIDED", "claims": [claim("INR 65 per jar", amount=65, currency="INR", unit="jar")]},
        "finance.sellingPrice": {"status": "PROVIDED", "claims": [claim("INR 130 per jar", amount=130, currency="INR", unit="jar")]},
        "overview.proposedLocation": {"status": "PROVIDED", "claims": [claim("Pune")]},
    })
    validated = validate_facts(facts, [{"id": "pitch", "original": text, "english": text}])
    assert validated["overview.proposedLocation"]["value"] == "Pune"
    assert score(validated)["unitContribution"]["amount"] == 65
    validated["finance.sellingPrice"]["claims"][0]["unit"] = "kg"
    assert score(validated)["unitContribution"] is None

@pytest.mark.parametrize("text,language", [("मैं घर का व्यवसाय शुरू करना चाहता हूँ।", "hi"), ("मी घरगुती व्यवसाय सुरू करणार आहे.", "mr"), ("मी home business सुरू करणार आहे.", "mr")])
def test_c_d_e_multilingual_pipeline(client, models, text, language):
    record = create(client, text, "auto")
    assert record["sources"][0]["original"] == text
    assert record["sources"][0]["language"] == language
    assert record["sources"][0]["english"] == "I want a home business."
    q = client.post("/api/clarification/" + record["id"] + "/next-question", headers=AUTH, json={}).json()["questions"][0]
    assert q["translations"][language].startswith("प्रश्न")

def test_f_dynamic_questions_receive_actual_context(client, models):
    record = create(client)
    response = client.post("/api/clarification/" + record["id"] + "/next-question", headers=AUTH, json={})
    assert response.status_code == 200
    assert any("eligibleFields" in data and data["sources"][0]["original"] == record["sources"][0]["original"] for _, data in models)
    again = client.post("/api/clarification/" + record["id"] + "/next-question", headers=AUTH, json={})
    assert len(again.json()["questions"]) == 1

def test_g_conflicting_financial_claims():
    text = "Investment 10000. Investment 20000."
    raw = extraction({"finance.initialInvestment": {"status": "PROVIDED", "claims": [claim("10000", amount=10000), claim("20000", amount=20000)]}})
    result = validate_facts(raw, [{"id": "pitch", "original": text, "english": text}])
    assert result["finance.initialInvestment"]["status"] == "CONFLICTING"
    assert result["finance.initialInvestment"]["value"] is None

def test_unsupported_evidence_numbers_units_rejected():
    source = [{"id": "pitch", "original": "Cost 50 INR per jar.", "english": "Cost 50 INR per jar."}]
    for c in [claim("500"), claim("50", amount=500), claim("50", unit="kg"), claim("50", source_id="made-up"), claim("Pune")]:
        facts = extraction({"finance.unitCost": {"status": "PROVIDED", "claims": [c]}})
        field = validate_facts(facts, source)["finance.unitCost"]
        assert field["value"] is None
        assert field["status"] == "UNCLEAR"

def test_translation_numeric_claim_checked_against_original():
    raw = extraction({"finance.initialInvestment": {"status": "PROVIDED", "claims": [claim("500", amount=500)]}})
    result = validate_facts(raw, [{"id": "pitch", "original": "₹५०", "english": "INR 500"}])
    assert result["finance.initialInvestment"]["status"] == "UNCLEAR"

def test_h_workflow_persistence_isolation_and_assessor_handoff(client, models):
    record = create(client)
    sid = record["id"]
    assert client.post(f"/api/submissions/{sid}/submit-to-assessor", headers=AUTH, json={}).status_code == 409
    assert client.post(f"/api/submissions/{sid}/confirm", headers=AUTH, json={}).status_code == 409
    assert client.post(f"/api/submissions/{sid}/finalize", headers=AUTH, json={}).status_code == 409
    q = client.post(f"/api/clarification/{sid}/next-question", headers=AUTH, json={}).json()["questions"][0]
    assert client.post(f"/api/submissions/{sid}/finalize", headers=AUTH, json={}).status_code == 409
    response = client.post(f"/api/clarification/{sid}/answer", headers=AUTH, json={"question_id": q["id"], "dont_know": True})
    assert response.status_code == 200
    prepare_confirmed(client, record)
    final = client.post(f"/api/submissions/{sid}/finalize", headers=AUTH, json={})
    assert final.status_code == 200, final.text
    assert final.json()["finalScore"]["status"] == "FINAL"
    assert client.post(f"/api/submissions/{sid}/confirm", headers=AUTH, json={}).status_code == 200
    submitted = client.post(f"/api/submissions/{sid}/submit-to-assessor", headers=AUTH, json={})
    assert submitted.status_code == 200
    assert submitted.json()["submittedAt"]
    assert client.get(f"/api/submissions/{sid}", headers=AUTH).json()["state"] == "SUBMITTED"
    assert len(client.get("/api/submissions", headers=ASSESSOR).json()) == 1
    assert client.get(f"/api/submissions/{sid}", headers={"Authorization": "Bearer other-assessor"}).status_code == 403
    assert client.get(f"/api/submissions/{sid}", headers={"Authorization": "Bearer other-beneficiary"}).status_code == 403
    assert client.post(f"/api/clarification/{sid}/answer", headers=AUTH, json={"question_id":q["id"],"answer":"Edit"}).status_code == 409
    assert client.post(f"/api/submissions/{sid}/finalize", headers=ASSESSOR, json={}).status_code == 403

def test_i_model_unavailable_no_fabricated_result(client, monkeypatch):
    async def unavailable(*args, **kwargs):
        raise RuntimeError("Qwen unavailable")
    monkeypatch.setattr(QwenService, "generate", unavailable)
    result = client.post("/api/pipeline/process-text", headers=AUTH, json={"text": "My real business pitch", "language": "en"})
    assert result.status_code == 503
    assert "facts" not in result.json()

def test_failed_extraction_retains_draft_for_retry(client, models, monkeypatch):
    async def fail(*args, **kwargs):
        raise ValueError("Invalid model output")
    monkeypatch.setattr(main, "extract", fail)
    result = client.post("/api/pipeline/process-text", headers=AUTH, json={"text":"A tailoring business", "language":"en"})
    assert result.status_code == 503
    saved = client.get("/api/submissions", headers=AUTH).json()
    assert saved[0]["state"] == "DRAFT"
    assert saved[0]["facts"] == {}

def test_answer_edit_replaces_source_and_recalculates(client, models):
    record = create(client)
    sid = record["id"]
    q = client.post(f"/api/clarification/{sid}/next-question", headers=AUTH, json={}).json()["questions"][0]
    for text in ["My capital is INR 5000.", "My capital is INR 6000."]:
        response = client.post(f"/api/clarification/{sid}/answer", headers=AUTH, json={"question_id":q["id"],"answer":text,"language":"en"})
        assert response.status_code == 200, response.text
    record = response.json()
    assert len(record["sources"]) == 2
    assert record["sources"][1]["original"] == "My capital is INR 6000."
    assert record["facts"]["finance.initialInvestment"]["value"] == "My capital is INR 6000."

def test_no_account_no_access(client):
    assert client.get("/api/submissions").status_code in (401,403)
    assert client.get("/api/submissions", headers={"Authorization":"Bearer invalid"}).status_code == 401

def test_english_bypasses_translation_endpoint(monkeypatch):
    monkeypatch.delenv("INDICTRANS_ENDPOINT", raising=False)
    assert asyncio.run(IndicTransService.translate("Original English", "en", "en")) == "Original English"
    with pytest.raises(RuntimeError, match="INDICTRANS_ENDPOINT"):
        asyncio.run(IndicTransService.translate("नमस्ते", "hi", "en"))

def test_document_errors_are_actionable(client):
    result = client.post("/api/pipeline/process-document", headers=AUTH, files={"file": ("plan.docx", b"not a pdf")})
    assert result.status_code == 415
    result = client.post("/api/pipeline/process-document", headers=AUTH, files={"file": ("plan.txt", b"A real tailoring proposal.")})
    assert result.json()["text"] == "A real tailoring proposal."
    assert result.json()["reviewRequired"] is True

@pytest.mark.skipif(os.getenv("RUN_LIVE_AI_TESTS") != "1", reason="Live Qwen/IndicTrans2 endpoints not configured; set RUN_LIVE_AI_TESTS=1")
@pytest.mark.parametrize("text,lang", [
    ("I want a homemade pickle and masala business for local customers, promoted through social media.", "en"),
    ("मैं घरेलू अचार का व्यवसाय शुरू करना चाहता हूँ।", "hi"),
    ("मी घरगुती लोणच्याचा व्यवसाय सुरू करणार आहे.", "mr"),
    ("నేను ఇంటి నుండి వ్యాపారం ప్రారంభించాలనుకుంటున్నాను.", "te"),
    ("நான் வீட்டிலிருந்து வணிகம் தொடங்க விரும்புகிறேன்.", "ta"),
    ("ನಾನು ಮನೆಯಿಂದ ವ್ಯಾಪಾರ ಆರಂಭಿಸಲು ಬಯಸುತ್ತೇನೆ.", "kn"),
    ("আমি বাড়ি থেকে ব্যবসা শুরু করতে চাই।", "bn"),
])
def test_live_model_extraction(text, lang):
    from services.screening import extract
    src = asyncio.run(main.source(text, lang, "pitch"))
    facts = asyncio.run(extract([src]))
    assert all(facts[k]["value"] is None for k in FIELDS if k.startswith("finance."))
    assert facts["overview.productService"]["status"] == "PROVIDED"


def complete(client, record):
    sid = record["id"]
    q = client.post(f"/api/clarification/{sid}/next-question", headers=AUTH, json={}).json()["questions"][0]
    assert client.post(f"/api/clarification/{sid}/answer", headers=AUTH, json={"question_id":q["id"],"dont_know":True}).status_code == 200
    prepare_confirmed(client, record)
    final = client.post(f"/api/submissions/{sid}/finalize", headers=AUTH, json={})
    assert final.status_code == 200, final.text
    return final.json()

def test_selected_language_applies_to_final_report(client, models):
    record = complete(client, create(client, "मी घरगुती व्यवसाय सुरू करणार आहे.", "mr"))
    assert record["reportTranslations"]["mr"]["explanation"].startswith("प्रश्न")
    changed = client.post(f"/api/submissions/{record['id']}/language", headers=AUTH, json={"language":"hi"})
    assert changed.status_code == 200
    assert changed.json()["reportTranslations"]["hi"]["recommendations"][0].startswith("प्रश्न")

def test_assessor_review_persists_and_overrides_need_reasons(client, models):
    record = complete(client, create(client))
    sid = record["id"]
    client.post(f"/api/submissions/{sid}/confirm", headers=AUTH, json={})
    client.post(f"/api/submissions/{sid}/submit-to-assessor", headers=AUTH, json={})
    review = {"feedback":"Please document the equipment and startup funding.", "decision":"NEEDS_FURTHER_REFINEMENT", "overrides":{"businessClarity":3}}
    assert client.post(f"/api/submissions/{sid}/review", headers=ASSESSOR, json=review).status_code == 422
    review["justification"] = "The product is described, but location is missing."
    saved = client.post(f"/api/submissions/{sid}/review", headers=ASSESSOR, json=review)
    assert saved.status_code == 200, saved.text
    assert client.get(f"/api/submissions/{sid}", headers=AUTH).json()["assessorReview"]["feedback"] == review["feedback"]
    assert client.post(f"/api/submissions/{sid}/review", headers=AUTH, json=review).status_code == 403

def test_correction_invalidates_final_report(client, models):
    record = complete(client, create(client))
    response = client.post(f"/api/submissions/{record['id']}/correction-question", headers=AUTH, json={"field":"finance.initialInvestment"})
    assert response.status_code == 200, response.text
    assert response.json()["state"] == "CLARIFICATION"
    assert "report" not in response.json()
    assert "finalScore" not in response.json()

def test_estimates_not_silently_confirmed():
    text = "Estimated investment about INR 10000."
    raw = extraction({"finance.initialInvestment":{"status":"PROVIDED","claims":[claim("INR 10000",text,amount=10000,currency="INR")]}})
    field = validate_facts(raw,[{"id":"pitch","original":text,"english":text}])["finance.initialInvestment"]
    assert field["status"] == "UNCLEAR"
    assert field["value"] is None

def test_provider_contracts_and_failures(monkeypatch):
    import httpx
    original_client = httpx.AsyncClient
    captured = []
    def handler(request):
        payload = json.loads(request.content)
        captured.append((str(request.url),payload))
        if str(request.url).endswith("/api/chat"):
            return httpx.Response(200,json={"message":{"content":'{"ok":true}'}})
        return httpx.Response(200,json={"choices":[{"message":{"content":'{"ok":true}'}}]})
    monkeypatch.setattr(httpx,"AsyncClient",lambda **kw: original_client(transport=httpx.MockTransport(handler),**kw))
    schema={"type":"object","properties":{"ok":{"type":"boolean"}},"required":["ok"],"additionalProperties":False}
    monkeypatch.setenv("QWEN_PROVIDER","ollama")
    assert asyncio.run(QwenService.generate("instruction",{"pitch":"input"},schema))["ok"]
    assert captured[-1][1]["format"] == schema
    monkeypatch.setenv("QWEN_PROVIDER","openai")
    monkeypatch.setenv("QWEN_ENDPOINT","http://local/v1")
    assert asyncio.run(QwenService.generate("instruction",{},schema))["ok"]
    assert captured[-1][0] == "http://local/v1/chat/completions"
    assert captured[-1][1]["response_format"]["json_schema"]["strict"] is True

def test_gateway_numeric_corruption_is_rejected(monkeypatch):
    import httpx
    original_client=httpx.AsyncClient
    monkeypatch.setenv("INDICTRANS_ENDPOINT","http://gateway/translate")
    monkeypatch.setattr(httpx,"AsyncClient",lambda **kw:original_client(transport=httpx.MockTransport(lambda request:httpx.Response(200,json={"translated_text":"INR 500"})),**kw))
    with pytest.raises(ValueError,match="numeric"):
        asyncio.run(IndicTransService.translate("₹५०","hi","en"))


def test_explicit_correction_supersedes_only_target_field():
    sources = [
        {'id':'pitch','original':'Capital INR 10000 in Pune.','english':'Capital INR 10000 in Pune.'},
        {'id':'correction','original':'Actually capital INR 20000.','english':'Actually capital INR 20000.','correctsField':'finance.initialInvestment'},
    ]
    raw = extraction({
        'finance.initialInvestment': {'status':'PROVIDED','claims':[claim('INR 10000',amount=10000,currency='INR'),claim('INR 20000',source_id='correction',amount=20000,currency='INR')]},
        'overview.proposedLocation': {'status':'PROVIDED','claims':[claim('Pune')]},
    })
    validated = validate_facts(raw,sources)
    assert validated['finance.initialInvestment']['value'] == 'INR 20000'
    assert validated['overview.proposedLocation']['value'] == 'Pune'


def prepare_confirmed(client, record):
    fields={key:{"value":"Explicit test beneficiary statement for "+key} for key in FIELDS}
    response=client.post("/api/submissions/"+record["id"]+"/fields",headers=AUTH,json={"title":"Test profile","language":record["language"],"fields":fields})
    assert response.status_code==200,response.text
    response=client.post("/api/submissions/"+record["id"]+"/confirm-fields",headers=AUTH,json={"fields":list(FIELDS)})
    assert response.status_code==200,response.text
    response=client.post("/api/submissions/"+record["id"]+"/ai-score",headers=AUTH,json={})
    assert response.status_code==200,response.text
