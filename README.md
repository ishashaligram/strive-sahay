# Tata STRIVE — STRIVE SAHAY

A multilingual business-idea screening and mentoring portal for Tata STRIVE programme beneficiaries, assessors and administrators. Beneficiaries develop an idea through guided questions; assessors review the supporting evidence; administrators monitor progress and record programme decisions.

## Separate URLs for every role

**Each role has its own login URL and dashboard.** The public homepage is a beneficiary entrance. Assessor and admin login cards are intentionally not displayed on it.

The current local demo runs at **http://127.0.0.1:3001**.

| Role / page | Login or entry URL | Dashboard URL |
| --- | --- | --- |
| Public homepage | [http://127.0.0.1:3001/](http://127.0.0.1:3001/) | — |
| Beneficiary | [http://127.0.0.1:3001/beneficiary/auth](http://127.0.0.1:3001/beneficiary/auth) | [http://127.0.0.1:3001/beneficiary/dashboard](http://127.0.0.1:3001/beneficiary/dashboard) |
| Assessor | [http://127.0.0.1:3001/assessor/login](http://127.0.0.1:3001/assessor/login) | [http://127.0.0.1:3001/assessor/dashboard](http://127.0.0.1:3001/assessor/dashboard) |
| Admin / programme manager | [http://127.0.0.1:3001/admin/login](http://127.0.0.1:3001/admin/login) | [http://127.0.0.1:3001/admin/dashboard](http://127.0.0.1:3001/admin/dashboard) |
| Beneficiary language selection | [http://127.0.0.1:3001/beneficiary/language](http://127.0.0.1:3001/beneficiary/language) | — |

For deployment, replace `http://127.0.0.1:3001` with your deployed origin and retain these paths. These are separate routes within one application, not separate servers. Dashboard access and API permissions are checked by role; a different URL alone does not grant access.

**Presentation authentication:** each role's login screen offers Sign in and Register using a phone number. The six-digit demonstration OTP appears on screen; no SMS is sent. This demo registration flow is not production staff provisioning. Use separate browser profiles or private windows for simultaneous roles, or sign out before switching roles in the same browser session.

## Beneficiary journey

1. Choose a language and sign in or register. Existing cohort members enter their dashboard; beneficiaries without a cohort select an active programme cohort. A coordinator must create an active cohort if none exists.
2. Type a business pitch in the chosen language. The title is optional. Audio and document options remain available under Other input options, but typed input is the recommended demo path.
3. Review the extracted business facts, correct translations or values, answer the major questions, and explicitly confirm the information. Missing details stay blank.
4. Answer contextual questions across the assessment domains. Unknown or unsupported answers do not satisfy the scoring requirements.
5. Receive a final assessment, SWOT guidance, local-market research tasks and an AI business-plan draft. A pitch-only completeness measure is not a final readiness score.
6. For a score below the beneficiary handoff threshold, improve the identified fields, start a reassessment or request mentoring. A qualifying completed case can proceed to assessor review.

The simplified dashboard includes one-question-at-a-time answers, regional-language selection and read-aloud controls. Government scheme and NGO links help users explore support; provider eligibility and availability must be checked separately.

## Assessor workflow

- Sign in at **`/assessor/login`** and open assigned cases.
- Open **Original pitch** to see the regional source and English translation side by side.
- Review confirmed facts, clarification answers, assessment evidence and the original pitch.
- Send follow-up questions and record a recommendation with a reason.
- Record trainer or mentor progress, completion percentages and supporting feedback for the administrator.

Automatic allocation respects configured availability and capacity. Retrying an automatic assignment preserves the completed assignment and avoids duplicate assignment-history entries. Administrators can explicitly transfer a case to another eligible assessor with a reason.

## Administrator workflow

- Sign in at **`/admin/login`**.
- View beneficiaries, cases, cohorts, assessment scores, assessor recommendations and programme decisions.
- Review training and mentoring completion, named reviewer feedback and progress history.
- Set programme investment-review limits: minimum final assessment score, training completion and mentoring completion. Initial defaults are **7/10, 70% and 70%** respectively.
- Mark a qualifying case **Eligible for funding review**, or return it for improvement with a reason.
- Manage cohorts, assessor capacity, assignments and cohort transfers; export filtered case data and inspect audit records.

Meeting the limits enables admin review; it does not automatically approve eligibility. Funding-review eligibility also requires a current final assessment and an investment-readiness recommendation from the assigned assessor. Case or limit changes require a fresh eligibility review. Synthetic demo scores cannot qualify.

**Funding-review eligibility is an internal programme decision, not approval or disbursement of a loan, grant or investment.** The admin-configurable investment limits are separate from the beneficiary's existing assessment handoff threshold.

## Multilingual translation

Supported languages: **English, Hindi, Marathi, Telugu, Tamil, Kannada, Bengali and Odia**.

The current local translation provider is **NLLB-200**. IndicTrans2 integration is prepared but is not active; its official checkpoints require Hugging Face account access.

    Regional typed pitch → preserved original + English translation
                         → evidence extraction and assessment
                         → guidance and feedback in the selected beneficiary language

English input bypasses unnecessary translation. Original text and English processing text are retained separately. Assessor feedback, mentoring tasks, follow-up questions and generated guidance are localized for the beneficiary's selected language. Translation and extraction need human review; successful pipeline checks do not guarantee perfect wording or semantic accuracy.

## Technology and local services

| Component | Implementation / local address |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS; port `3001` for this demo |
| Application API | FastAPI; `http://127.0.0.1:8000` |
| Translation, OCR and speech gateway | FastAPI; `http://127.0.0.1:8001` |
| Local business AI | Qwen2.5-1.5B-Instruct through llama.cpp; `http://127.0.0.1:8080/v1` |
| Persistence | SQLite; presentation records are separate from the original screening database |
| Translation | Local NLLB-200; optional IndicTrans2 activation |
| Speech and document inputs | Optional local models and OCR dependencies; review their output |

## Local setup

Prerequisites: Node.js **22.12+** with pnpm, Python **3.11 or 3.12**, and the selected local model runtimes and weights. Model files, dependencies, private environment files and databases are not included in Git. A fresh clone requires model setup before AI operations work.

From the project folder, in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
pnpm install
# Run only if backend/.env does not already exist:
Copy-Item backend/.env.example backend/.env
```

Configure `backend/.env` for your installed model services. For the current local demo:

```dotenv
QWEN_PROVIDER=openai
QWEN_ENDPOINT=http://127.0.0.1:8080/v1
QWEN_MODEL=local-business-1.5b
TRANSLATION_PROVIDER=nllb
INDICTRANS_ENDPOINT=http://127.0.0.1:8001/translate
```

`INDICTRANS_ENDPOINT` is the adapter's configuration name; the gateway uses `TRANSLATION_PROVIDER` to select NLLB or IndicTrans2. Install/download the NLLB model first; setting these variables alone does not install models.

Start the configured local Qwen runtime and the two APIs:

```powershell
.\scripts\start_local_llm.ps1
.\scripts\start_backend_services.ps1 -PythonExecutable (Resolve-Path .venv/Scripts/python.exe).Path
```

The Qwen helper expects the llama.cpp executable and GGUF checkpoint at the paths documented in [Backend services](docs/BACKEND_SERVICES.md). The current desktop installation uses an additional project-local Python runtime; the virtual-environment commands above are for a new setup.

Start the frontend in another terminal:

```powershell
pnpm exec vite --host 127.0.0.1 --port 3001 --strictPort
```

Open [the homepage](http://127.0.0.1:3001/). Vite proxies `/api` requests to port `8000`; `BACKEND_URL` can override that target. For deployment, configure an equivalent reverse proxy and SPA route fallback so direct staff login URLs work.

API documentation: [application API](http://127.0.0.1:8000/docs) · [processing API](http://127.0.0.1:8001/docs). Keep model services on loopback unless a separate secured deployment is configured. Keep secrets in the backend environment, never in frontend variables or Git.

## Verification

```powershell
python -m pytest backend/tests -q
pnpm test
pnpm lint
pnpm build
```

Backend tests use explicit model doubles where appropriate. Real model smoke checks require running services:

```powershell
python scripts/verify_regional_text.py
python scripts/verify_accessible_journey.py
```

These scripts use temporary synthetic records rather than live beneficiary data. The typed-pitch smoke check covers all seven regional languages, preserved originals, English translations and supported extracted facts. It is not a complete human evaluation of translation quality. Clearly labelled synthetic demo records contain predefined example scores, not live assessments.

## Further documentation

- [Regional typed-pitch demo](docs/REGIONAL_TEXT_DEMO.md)
- [Beneficiary journey and accessibility](docs/BENEFICIARY_JOURNEY.md)
- [Training, mentoring and investment review](docs/INVESTMENT_READINESS.md)
- [Local IndicTrans2 setup and access requirements](docs/LOCAL_INDICTRANS.md)
- [Backend services and model setup](docs/BACKEND_SERVICES.md)
- [Frontend/backend API contract](docs/FRONTEND_BACKEND_CONTRACT.md)
- [Synthetic demo accounts](docs/SYNTHETIC_DEMO_ACCOUNTS.md)
- [Dataset behavior and extraction requirements](docs/DATASET_BEHAVIOR.md)
- [Homepage visual references](docs/HOMEPAGE_DESIGN.md)

Earlier handoff and status documents may describe previous iterations. This README describes the current role URLs, presentation login and active local translation provider.
