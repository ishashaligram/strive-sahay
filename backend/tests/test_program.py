"""Program vertical-slice tests. Model doubles are restricted to tests."""
import json
import io
import pytest
from test_workflow import client, models, AUTH, ASSESSOR
from services.financials import financials
from services.program import CRITICAL
ADMIN={"Authorization":"Bearer admin-token"}

@pytest.fixture(autouse=True)
def add_admin(monkeypatch):
    # Run after client fixture initialization where needed using helper below.
    pass

def grant_admin(monkeypatch):
    import os
    accounts=json.loads(os.environ["SCREENING_ACCOUNTS"])
    accounts["admin-token"]={"id":"admin1","role":"admin"}
    monkeypatch.setenv("SCREENING_ACCOUNTS",json.dumps(accounts))

def form(client,fields=None,language="en"):
    response=client.post("/api/pipeline/process-structured",headers=AUTH,json={"title":"Test beneficiary tailoring plan","language":language,"region":"Test region","trade":"tailoring","fields":fields or {
        "overview.productService":{"value":"Tailoring and garment repairs"},
        "finance.unitCost":{"value":"INR 60 per garment","amount":60,"currency":"INR","unit":"garment"},
        "finance.sellingPrice":{"value":"INR 100 per garment","amount":100,"currency":"INR","unit":"garment"},
        "finance.expectedSales":{"value":"100 garments per month","amount":100,"unit":"garment","period":"month","estimate":True},
        "finance.monthlyExpenses":{"value":"INR 1000 monthly fixed expenses","amount":1000,"currency":"INR","period":"month","costBasis":"fixed"},
        "finance.initialInvestment":{"value":"INR 10000","amount":10000,"currency":"INR"},
        "finance.availableCapital":{"value":"INR 4000","amount":4000,"currency":"INR"},
    }})
    assert response.status_code==200,response.text
    record=response.json()
    result=client.post(f"/api/submissions/{record['id']}/confirm-fields",headers=AUTH,json={"fields":[k for k,f in record["facts"].items() if f["status"]=="PROVIDED"]})
    assert result.status_code==200,result.text
    return result.json()

def test_financials_require_confirmation_and_use_correct_formula(client):
    record=form(client)
    calculations=record["financials"]["calculations"]
    assert calculations["unitContribution"]["amount"]==40
    assert calculations["monthlyRevenue"]["amount"]==10000
    assert calculations["estimatedMonthlyProfit"]["amount"]==3000
    assert calculations["breakEvenQuantity"]["amount"]==25
    assert calculations["fundingGap"]["amount"]==6000
    assert len(record["financials"]["scenarios"])==3
    facts=record["facts"]
    facts["finance.unitCost"]["confirmed"]=False
    assert "estimatedMonthlyProfit" not in financials(facts)["calculations"]

def test_incomplete_case_escalates_and_admin_decides_without_fake_score(client,monkeypatch):
    grant_admin(monkeypatch)
    record=form(client)
    sid=record["id"]
    assert client.post(f"/api/submissions/{sid}/finalize",headers=AUTH,json={}).status_code==409
    result=client.post(f"/api/submissions/{sid}/escalate",headers=AUTH,json={"reason":"I need help documenting customers and location."})
    assert result.status_code==200,result.text
    assert result.json()["state"]=="CLARIFICATION_REQUIRED"
    queue=client.get("/api/submissions",headers=ASSESSOR).json()
    assert any(r["id"]==sid for r in queue)
    wrong=client.post(f"/api/admin/submissions/{sid}/decision",headers=ADMIN,json={"decision":"APPROVE_RECOMMENDATION","reason":"Premature decision"})
    assert wrong.status_code==409
    recommendation=client.post(f"/api/submissions/{sid}/recommendation",headers=ASSESSOR,json={"recommendation":"FURTHER_MENTORING_REQUIRED","reason":"Please validate demand and document the proposed location."})
    assert recommendation.status_code==200,recommendation.text
    assert recommendation.json()["state"]=="ADMIN_REVIEW"
    denied=client.post(f"/api/admin/submissions/{sid}/decision",headers=ASSESSOR,json={"decision":"APPROVE_RECOMMENDATION","reason":"Not allowed"})
    assert denied.status_code==403
    final=client.post(f"/api/admin/submissions/{sid}/decision",headers=ADMIN,json={"decision":"APPROVE_RECOMMENDATION","reason":"Approve the mentoring recommendation; no funding is authorized."})
    assert final.status_code==200,final.text
    beneficiary=client.get(f"/api/submissions/{sid}",headers=AUTH).json()
    assert beneficiary["adminDecision"]["decision"]=="APPROVE_RECOMMENDATION"
    assert "finalScore" not in beneficiary
    overview=client.get("/api/admin/overview",headers=ADMIN).json()
    assert overview["counts"]["adminApproved"]==1
    assert overview["groups"]["trade"][0]["count"]==1

def test_capacity_and_pending_queue_are_atomic(client,monkeypatch):
    grant_admin(monkeypatch)
    response=client.post("/api/admin/entities/capacity",headers=ADMIN,json={"id":"a1","data":{"maximum":1,"preferred":1,"available":True,"regions":[],"trades":[]}})
    assert response.status_code==200
    client.post("/api/admin/entities/capacity",headers=ADMIN,json={"id":"a2","data":{"maximum":0,"preferred":0,"available":False,"regions":[],"trades":[]}})
    first=form(client)
    second=form(client)
    a=client.post(f"/api/submissions/{first['id']}/escalate",headers=AUTH,json={"reason":"Need assistance with business planning."})
    b=client.post(f"/api/submissions/{second['id']}/escalate",headers=AUTH,json={"reason":"Need assistance with customer validation."})
    assert a.status_code==200 and b.status_code==200
    assigned=[r for r in [a.json(),b.json()] if r["assessor"]=="a1"]
    assert len(assigned)<=1
    assert any(r["assignmentStatus"]=="PENDING_CAPACITY" for r in [a.json(),b.json()])
    assert client.post("/api/admin/entities/capacity",headers=AUTH,json={"id":"a1","data":{"maximum":100,"preferred":100}}).status_code==403

def test_plan_only_uses_confirmed_values_and_edits_are_separate(client):
    record=form(client)
    result=client.post(f"/api/submissions/{record['id']}/business-plan",headers=AUTH,json={})
    assert result.status_code==200,result.text
    plan=result.json()["businessPlan"]
    assert len(plan["sections"])==16
    assert "Tailoring and garment repairs" in plan["sections"]["Product or service"]
    assert plan["sections"]["Market and competitors"]=="To be confirmed"
    edited=client.post(f"/api/submissions/{record['id']}/business-plan/edit",headers=AUTH,json={"sections":{"Executive summary":"Beneficiary's draft summary"}})
    assert edited.status_code==200
    assert edited.json()["businessPlan"]["method"]=="BENEFICIARY_EDITED_DRAFT_NOT_VALIDATED_FACTS"
    assert edited.json()["facts"]["overview.productService"]["value"]=="Tailoring and garment repairs"

@pytest.mark.parametrize("language",["en","hi","mr","te","ta","kn","bn"])
def test_language_persistence_and_document_language_independent(client,language):
    result=client.post("/api/profile",headers=AUTH,json={"preferred_language":language})
    assert result.status_code==200
    assert client.get("/api/profile",headers=AUTH).json()["preferred_language"]==language
    record=form(client,language=language)
    assert record["language"]==language

def test_cohort_history_account_provisioning_and_auth(client,monkeypatch):
    grant_admin(monkeypatch)
    for cid in ["cohort_a","cohort_b"]:
        assert client.post("/api/admin/entities/cohort",headers=ADMIN,json={"id":cid,"data":{"name":cid,"status":"ACTIVE"}}).status_code==200
    record=form(client)
    for cid in ["cohort_a","cohort_b"]:
        response=client.post(f"/api/admin/submissions/{record['id']}/cohort",headers=ADMIN,json={"id":cid,"data":{"reason":"Approved cohort transfer"}})
        assert response.status_code==200
    assert len(response.json()["cohortHistory"])==2
    provision=client.post("/api/admin/accounts",headers=ADMIN,json={"id":"new_beneficiary","role":"beneficiary","name":"Test new user"})
    assert provision.status_code==200
    token=provision.json()["token"]
    assert client.get("/api/session",headers={"Authorization":"Bearer "+token}).json()["role"]=="beneficiary"
    assert "tokenHash" not in client.get("/api/admin/overview",headers=ADMIN).text

def test_human_clarification_and_answers(client):
    record=form(client)
    sid=record["id"]
    client.post(f"/api/submissions/{sid}/escalate",headers=AUTH,json={"reason":"I need guidance with the business plan."})
    response=client.post(f"/api/submissions/{sid}/request-clarification",headers=ASSESSOR,json={"reason":"Where will you operate your tailoring service?"})
    assert response.status_code==200,response.text
    q=response.json()["humanQuestions"][0]
    result=client.post(f"/api/submissions/{sid}/human-answer",headers=AUTH,json={"task_id":q["id"],"evidence":"I plan to operate from my home."})
    assert result.status_code==200
    assert result.json()["state"]=="CLARIFICATION_REQUIRED"
    assert result.json()["humanQuestions"][0]["answer"]=="I plan to operate from my home."

def test_docx_extraction(client):
    from docx import Document
    document=Document()
    document.add_paragraph("Actual tailoring proposal for local garment repair.")
    buffer=io.BytesIO()
    document.save(buffer)
    response=client.post("/api/pipeline/process-document",headers=AUTH,files={"file":("proposal.docx",buffer.getvalue(),"application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
    assert response.status_code==200,response.text
    assert "Actual tailoring proposal" in response.json()["text"]


def sample_pdf(texts):
    """Small real PDF fixture generated in memory; never writes program records."""
    objects=[b"<< /Type /Catalog /Pages 2 0 R >>",b"",b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
    children=[]
    for text in texts:
        stream=("BT /F1 12 Tf 50 760 Td ("+text.replace("(","\\(").replace(")","\\)")+") Tj ET").encode()
        page_id=len(objects)+1
        stream_id=page_id+1
        children.append(str(page_id)+" 0 R")
        objects.append(("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents "+str(stream_id)+" 0 R >>").encode())
        objects.append(b"<< /Length "+str(len(stream)).encode()+b" >>\nstream\n"+stream+b"\nendstream")
    objects[1]=("<< /Type /Pages /Count "+str(len(children))+" /Kids ["+" ".join(children)+"] >>").encode()
    output=bytearray(b"%PDF-1.4\n")
    offsets=[0]
    for index,obj in enumerate(objects,1):
        offsets.append(len(output))
        output.extend(str(index).encode()+b" 0 obj\n"+obj+b"\nendobj\n")
    xref=len(output)
    output.extend(("xref\n0 "+str(len(objects)+1)+"\n0000000000 65535 f \n").encode())
    for offset in offsets[1:]:output.extend(f"{offset:010d} 00000 n \n".encode())
    output.extend(("trailer\n<< /Size "+str(len(objects)+1)+" /Root 1 0 R >>\nstartxref\n"+str(xref)+"\n%%EOF").encode())
    return bytes(output)

def test_real_pdf_every_page_and_secure_original(client):
    original=sample_pdf(["Page one tailoring proposal","Page two startup investment INR 12000"])
    response=client.post("/api/pipeline/process-document",headers=AUTH,files={"file":("proposal.pdf",original,"application/pdf")})
    assert response.status_code==200,response.text
    result=response.json()
    assert "Page one tailoring proposal" in result["text"]
    assert "Page two startup investment INR 12000" in result["text"]
    assert [p["page_number"] for p in result["pages"]]==[1,2]
    mid=result["uploadId"]
    assert client.get("/api/media/"+mid,headers=AUTH).content==original
    assert client.get("/api/media/"+mid,headers={"Authorization":"Bearer other-beneficiary"}).status_code==403

def test_scanned_pdf_never_fabricates_text(client,monkeypatch):
    monkeypatch.delenv("OCR_ENDPOINT",raising=False)
    result=client.post("/api/pipeline/process-document",headers=AUTH,files={"file":("scanned.pdf",sample_pdf([""]),"application/pdf")})
    assert result.status_code==503
    assert "OCR" in result.json()["detail"]
    assert "text" not in result.json()

def test_ocr_gateway_contract_with_explicit_test_double(client,monkeypatch):
    import httpx
    monkeypatch.setenv("OCR_ENDPOINT","http://test-ocr/recognize")
    monkeypatch.setattr(httpx,"post",lambda *args,**kwargs:httpx.Response(200,json={"text":"Explicit OCR test response","pages":[{"page_number":1,"text":"Explicit OCR test response"}]},request=httpx.Request("POST",args[0])))
    result=client.post("/api/pipeline/process-document",headers=AUTH,files={"file":("scanned.pdf",sample_pdf([""]),"application/pdf")})
    assert result.status_code==200,result.text
    assert result.json()["text"]=="Explicit OCR test response"



def test_expense_basis_cannot_be_assumed_and_numeric_metadata_must_match(client):
    record=form(client)
    facts=record["facts"]
    facts["finance.monthlyExpenses"]["claims"][0].pop("costBasis")
    result=financials(facts)
    assert "estimatedMonthlyProfit" not in result["calculations"]
    assert "breakEvenQuantity" not in result["calculations"]
    invalid=client.post("/api/pipeline/process-structured",headers=AUTH,json={"title":"Invalid amount test","fields":{"finance.unitCost":{"value":"INR 60 per item","amount":600,"currency":"INR","unit":"item"}}})
    assert invalid.status_code==422

def test_confirmed_fact_correction_history_is_immutable(client):
    record=form(client)
    sid=record["id"]
    original=record["facts"]["overview.productService"]["value"]
    response=client.post(f"/api/submissions/{sid}/fields",headers=AUTH,json={"title":record["title"],"fields":{"overview.productService":{"value":"Updated beneficiary description"}}})
    assert response.status_code==200,response.text
    changed=response.json()
    assert changed["facts"]["overview.productService"]["value"]=="Updated beneficiary description"
    assert changed["factHistory"][-1]["before"]["overview.productService"]["value"]==original
    assert not changed["facts"]["overview.productService"]["confirmed"]
    assert changed["currentScore"]["stale"] is True
