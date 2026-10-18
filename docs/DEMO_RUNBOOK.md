# Live demo walkthrough

Open http://127.0.0.1:3001. Keep the frontend, application API (8000), processing API (8001), and Qwen server (8080) running.

## What was verified with actual inference

The isolated real-model API test completed phone registration for all three roles, English pitch extraction, editable facts and confirmations, Qwen questions covering all eight domains, Qwen final scoring and report, a business plan, automatic assessor allocation, assessor recommendation, program-manager decision, and beneficiary retrieval of that decision. The sample followed the mentoring path because its actual score was below the readiness threshold. No score was forced and no test accounts were added to the user's database.

Translation inference produced output for English, Hindi, Marathi, Tamil, Telugu, Kannada, Bengali and Odia, preserving a sample numeric amount. The active fallback is **NLLB-200**, not IndicTrans2. A successful inference does not establish translation accuracy for every document. IndicTrans2 still requires approved model access.

Actual 15-second Hindi and Odia dataset clips produced transcripts. Hindi used faster-whisper small; Odia used the MMS ory adapter. Transcripts require review. First-use Odia model loading and quantization are slow; avoid long audio during a time-limited demonstration. Full dataset recordings have not all been validated.

## Presentation sequence

1. Register an assessor at `/assessor/login` and a program manager at `/admin/login` first, so an assessor is available for assignment. This is labelled demonstration phone registration with an OTP shown on screen, not SMS. Use separate browser sessions for simultaneous roles, or sign out before switching.
2. Register the beneficiary at `/beneficiary/auth`; select English for the best-tested journey.
3. Upload a labelled English questionnaire or type a short pitch. Review the extracted text. Open **Add / correct business facts** to review prefilled values and add missing information.
4. Review explicit amounts, units and periods. Mark estimates. Confirm the business facts. Never present scenario assumptions as verified market evidence.
5. Answer the generated category questions and confirm their supported facts. Unknown answers keep requirements unresolved. Questions can take tens of seconds on this CPU; final scoring/report generation can take minutes.
6. Generate the assessment and business plan. A score below 7 follows the mentoring/escalation pathway. A qualifying completed assessment can be confirmed and submitted for assessor review.
7. Open the assigned assessor's dashboard, review the evidence, and record a recommendation with a reason.
8. Open the program-manager dashboard, review the recommendation, and record a decision. Return to the beneficiary to show the saved outcome.

## Recovery and diagnostics

Refresh saved progress instead of submitting the same pitch repeatedly. Browser console entries start with `STRIVE API`; backend logs include correlation IDs and model-stage timings. No personal source text or credentials belong in diagnostic logs. Do not close a processing dialog while a model request is active.

Use `scripts/start_local_llm.ps1` for Qwen and `scripts/start_backend_services.ps1` for APIs. These start the real services; they do not synthesize successful responses or install missing models. During a presentation, keep code reloading disabled. During development, restrict any watcher to `backend/`, not the entire dependency/model directory.
