# Dataset input and output behavior

The supplied archives were inspected locally without sending their contents to model, OCR, or speech services. The offline audit covers 19 PDFs, 23 filled-form PDFs, and 13 audio files. All 13 audio containers contain audio tracks. Audio transcription has not been run.

## Actual document audit

| Archive group | Files | Usable embedded text | OCR / visual review required |
| --- | ---: | ---: | ---: |
| PDFs | 19 | 12 | 7 |
| Filled forms | 23 | 5 | 18 |

Four Hindi PDFs contain scanned images without searchable text. Eighteen filled forms contain damaged embedded font text (including NUL characters). Three searchable PDFs contain crossed-out or overlapping answers. Readable embedded text is not proof that every extracted field is correct; source evidence and field-meaning verification still apply.

The raw archives, document text, personal details, screenshots, and audit report stay local under ignored `output/dataset-audit/`. They are not imported into live application records or committed as sample answers. `scripts/audit_dataset.py` reproduces this audit with user-provided archive paths and no network calls.

## Expected scenario behavior

| Scenario | Required behavior |
| --- | --- |
| Accurate answers | Extract supported facts with quotations; do not assume costs, investment, or sales quantity that were never supplied. Complete original answers do not automatically earn a passing score. |
| Missing answers or questions | Keep facts MISSING/UNCLEAR, preserve explicit empty answer markers, and ask relevant follow-ups. |
| Irrelevant or random answers | Verify relevance to the actual field. Do not accept a hobby as a location or a neighbour's snack price as this business's selling price. |
| Two languages / different question and answer languages | Preserve English prompts and translate Indic answer runs independently. Keep all original numbers. |
| Overwritten or crossed-out answers | Require OCR/visual review. Preserve the ambiguity and ask the beneficiary to clarify; do not pick the largest or newest-looking number automatically. |
| Changed questions and answers | Map by question meaning and submitted evidence, never by fixed question number. |
| Audio | Decode real speech through the configured recognition service, preserve the original transcript for review, then apply the same evidence checks. Never substitute dataset sample answers. |

PDF tables retain question/answer roles and continue across page breaks. Questionnaire prompts, example values, scenario labels, personal-profile Category, phone numbers, ages and PIN codes cannot become business evidence or determine a score.

## Canonical outputs

Every input feeds the same `ScreeningRecord` API contract: original sources, English processing text, detected category, facts with status/claims/validation, clarification questions, and later a confirmed final assessment. Dataset-specific fields include `operations.rawMaterials` and `finance.fundingSources`. Expected revenue uses `finance.revenueAssumptions`; it is not profit or expected sales quantity.

The final assessment still requires relevant confirmed clarification across all eight rubric domains. No scenario filename grants a score. A valid, complete application can still need additional financial, operational or risk evidence.

## Languages and services

Input/output routing supports English, Hindi, Marathi, Telugu, Tamil, Kannada, Bengali and Odia. Odia maps to `ory_Orya` for IndicTrans2. Odia primary navigation and form labels were added; some older interface messages use English fallback. These translations have not received native-speaker review. The supplied archives do not contain Tamil or Kannada examples, so no dataset-level claim is made for those languages.

- Searchable PDF parsing is local with pdfplumber. Damaged, scanned and overwritten documents require `OCR_ENDPOINT`.
- Fact extraction and semantic verification require the configured Qwen service.
- Non-English and mixed-language processing requires IndicTrans2.
- MP4, OGG, WAV, MP3, M4A, WebM and FLAC uploads are accepted. MP4 filenames and MIME types are preserved for the recognition gateway.
- `ASR_ENDPOINT` accepts multipart `file` plus ISO `language` (or `auto`) and returns `original_transcript`, `detected_language`, and optionally confidence. It is required by this adapter for Odia. Without it, other supported speech inputs use the existing real faster-whisper adapter.

Live OCR, speech, extraction, translation and report quality remain unverified until these services are connected. Offline audits and model-double regression tests are not live inference validation.

## Concurrent authentication integration

The teammate's Firebase backend/token verification and email/password UI are preserved. `VITE_AUTH_MODE=firebase` selects that integration. The default `presentation` mode keeps the requested phone registration and displayed OTP in a separate database. Firebase SDK initialization is lazy so an unconfigured Firebase project cannot blank the presentation login. Firebase staff roles remain server assigned; presentation roles remain isolated demo identities. Real Firebase sign-in has not been verified without credentials.
