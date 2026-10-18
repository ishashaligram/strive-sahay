# Judge demonstration status — STRIVE SAHAY

## Current state

The existing app was extended in place. Frontend: http://127.0.0.1:3001. Backend: http://127.0.0.1:8000. Both API health and Vite proxy return HTTP 200.

Your teammate's services are on another PC. No reachable service URL or database configuration has been provided. Local Qwen port 11434 and MongoDB port 27017 are closed. There is no configured Firebase integration in this workspace.

The existing SQLite adapter and submission IDs are reused. New program entities and original uploads share the same SQLite database. No second database engine was introduced, no remote database was modified, and no records were reset.

Source backup: .backups/20261018-082332/source.zip. No Git repository was present. The legacy Mongo importer was not run; its destructive action now requires explicit authorization for a disposable demo database.

## Connected features implemented

- Backend role authorization for beneficiary, assigned assessor and Admin; Admin uses backend-token login.
- Persisted preferred language, profile and cohort references.
- Central form schema using the existing stable field IDs, with requestedFunding added where absent.
- Structured beneficiary input without model inference, clearly labelled as beneficiary-entered information.
- Explicit fact confirmation/rejection, correction history, and stale assessment/plan invalidation.
- Actual Qwen extraction adapter, bounded document extraction chunks, and up-to-five contextual questions per round.
- Eight-domain Qwen rating endpoint; Python applies the specified weights and saves versions.
- Critical confirmed fields block final scoring. Formal review requires a current Qwen score at the project-defined 7/10 threshold.
- Human clarification escalation remains available without a final AI score.
- Recorded/uploaded audio and document review pipelines; secure original-file downloads.
- PDF extraction reads every page, extracts tables separately, preserves page metadata and requests configured OCR for scanned/garbled pages.
- DOCX paragraphs/tables, TXT and Markdown extraction.
- Sixteen-section editable business plan compiled only from confirmed facts, with missing sections marked To be confirmed.
- Browser Print / Save as PDF action on the plan preview.
- Deterministic startup costs, funding gap, unit contribution, monthly revenue/cost/profit, break-even and illustrative sales scenarios when explicit inputs permit.
- Monthly expense basis must be specified as fixed/total/variable; total expenses are not silently treated as fixed costs.
- Qwen roadmap generation and task-evidence submission endpoints.
- Local market fallback explicitly labels unavailable live data and offers a research checklist.
- Assessor queues, own capacity preference, human clarification, justified overrides and the four requested recommendation options.
- Admin-only final program decisions after recommendation, with reasons and audit history.
- Cohort create/update/status, cohort-transfer history, private account creation, capacity management.
- Atomic assignment by trade, region, availability and workload/effective-capacity ratio; overflow stays pending.
- Actual-record cohort/trade/assessor charts, filters, case drill-down and CSV export.

## Account setup blocker

Automatic approval review rejected automated creation of the three proposed local demo accounts because the Admin account creates security-sensitive access not explicitly authorized for those specific accounts. No demo credentials were created. There is no hardcoded password or authentication bypass.

Approval is needed to create exactly demo_beneficiary, demo_assessor and demo_admin for this local demo, with generated private tokens stored only in ignored local files. Existing account configuration would be preserved.

## Judge walkthrough once accounts are approved

1. Admin: create a cohort and set the assessor maximum capacity.
2. Beneficiary: choose Structured business form. Enter your own business facts or clearly identify a synthetic demonstration example.
3. Enter financial amount, currency, unit and monthly period explicitly. Identify fixed versus total operating costs. Mark sales forecasts as estimates.
4. Review and confirm supported fields. Inspect financial formulas, warnings and scenario assumptions.
5. Generate the sixteen-section confirmed-fact business plan. Missing information stays To be confirmed. Browser print can save the preview as PDF.
6. Request human clarification assistance for incomplete critical information.
7. Assigned assessor: open Clarification Required, request clarification or recommend Further Mentoring Required with a reason.
8. Admin: review the recommendation and record the final internal program decision.
9. Beneficiary: refresh to see the decision, explanation and next steps.
10. Admin: show charts and CSV export based on the actual records.

Before Qwen runs, the displayed score is explicitly evidence coverage, not an AI business rating. This walkthrough does not pretend AI inference or funding approval occurred.

## Full AI path

Configure backend/.env with the teammate's reachable QWEN_ENDPOINT and INDICTRANS_ENDPOINT. Configure OCR_ENDPOINT for scanned documents. The teammate's services must be reachable from this PC. No firewall rules or network exposure were changed.

Then submit reviewed text/PDF/audio, inspect extraction, confirm facts, answer clarification rounds, obtain a Qwen domain assessment, generate the final report, confirm and submit after critical-field and threshold checks pass. Human assessor recommendation and Admin decision follow.

Connecting the teammate's actual database still requires their configuration and schema; the standalone Mongo importer is not evidence of a connected database.

## Startup

Standard PowerShell, from this project directory:

~~~powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload --reload-dir backend
~~~

Separate frontend terminal:

~~~powershell
pnpm install
pnpm dev
~~~

This desktop used Codex bundled Python/Node and ignored .runtime-python because the default Python command was absent and npm was broken. Vite uses port 3001 because 3000 was occupied.

## Verification

| Check | Result |
|---|---|
| Backend | 42 passed; 7 live-model tests skipped |
| Frontend | 12 passed |
| TypeScript | Passed |
| Vite production build | Passed; non-blocking large-bundle warning |
| API startup / Vite API proxy | HTTP 200 |
| Browser | Admin login renders with backend-token authentication |
| Actual multipage PDF and DOCX parsing | Passed |
| Scanned PDF without OCR | Actionable error; no fabricated text |
| OCR adapter | Test double passed; no live OCR claim |
| Original-file ownership | Passed |
| Financial formulas and confirmation guards | Passed |
| Capacity/pending queue and authorization | Passed |
| Cohort history, analytics, human recommendation/Admin decision | Passed |
| Seven-language profile persistence/core i18next actions | Passed |
| Live Qwen/IndicTrans2/speech/OCR accuracy | Not verified |

Unit tests use explicit model doubles confined to tests. Runtime services have no mock-AI fallback. Test records use isolated temporary databases and do not overwrite application records.

## Language coverage and service availability

English, Hindi, Marathi, Telugu, Tamil, Kannada and Bengali core action translations are provided through i18next; preferred-language persistence is tested for all seven.

Entire beneficiary-interface localization is incomplete: several legacy/static field labels, errors and financial labels remain English. Dynamic translation adapters do not constitute verified complete localization.

Qwen: local service unavailable. IndicTrans2 and OCR gateways: unconfigured. faster-whisper recognizer/weights: not installed or verified here. Original/document language and preferred interaction language remain independent.

## Main files changed in this pass

Backend: backend/main.py; backend/services/program.py; backend/services/financials.py; backend/services/screening.py; backend/services/pdf_service.py; backend/provision_account.py; backend/tests/test_program.py; backend/tests/test_workflow.py; scripts/dataset_importer.py.

Frontend: src/components/ProgramAdmin.tsx; ProgramCaseTools.tsx; StructuredBusinessForm.tsx; ScreeningWorkspace.tsx; IdeaSubmissionModal.tsx; SplitScreenMentor.tsx; AccountLogin.tsx; Navbar.tsx; src/services/uiI18n.ts; screeningApi.ts; src/App.tsx; src/index.css; tests/languages.test.ts; package.json and pnpm-lock.yaml.

## Not completed / limitations

- Connection to the other PC's models and real teammate database.
- Approved provisioning of the local demonstration accounts.
- Entire seven-language interface/error localization and live accuracy verification.
- AI-authored narrative business plan: current plan is an accurately labelled confirmed-fact compilation; Qwen scoring/report/roadmap remain service-dependent.
- Standalone server-rendered multilingual PDF: current export uses browser print; layout across all scripts is unverified.
- Real SMS/OTP enrolment, SSO, account revocation/reset interfaces and the remote database's rules.
- Complete coordinator/assessor/cohort administration and every requested advanced analytics measure (registration/mentoring rates, turnaround charts, weak-domain cross-comparison).
- Live external local-business search.
- External funding/disbursement. Admin decisions are internal recommendations only.

This is a tested demonstration-oriented extension, not a production-readiness or perfect-accuracy claim.
