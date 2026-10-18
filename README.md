# STRIVE SAHAY — Multilingual AI Business Idea Screening & Mentoring Platform
### Built for the Tata STRIVE Hackathon

STRIVE SAHAY helps aspiring grassroots entrepreneurs submit, understand, improve, and assess business ideas in multiple Indian languages before they reach human assessors.

---

## 1. Key Architectural Innovations

1. **Pre-Screening Mentoring Loop:** Rather than assigning raw or under-developed ideas directly to human evaluators, the platform guides the entrepreneur through an adaptive, trade-specific questioning and gap-filling process.
2. **Deterministic 8-Domain Weighted Rubric:**
   - Business Clarity (10%)
   - Customer Demand (15%)
   - Market Potential (15%)
   - Financial Viability (20%)
   - Operational Feasibility (15%)
   - Competitive Advantage (10%)
   - Entrepreneur Readiness (10%)
   - Risk Awareness (5%)
3. **Structured Live Business Profile:** 5 real-time modules (Overview, Market, Finance, Operations, Risk) with evidence-backed provenance and fact statuses (`PROVIDED`, `MISSING`, `UNCLEAR`, `CONFLICTING`, `UNKNOWN`).
4. **Locally Hosted Multilingual Pitch-Processing Pipeline:**
   - **Audio:** `faster-whisper` for multilingual Indian speech recognition (Marathi, Hindi, Telugu, Tamil, Kannada, Bengali, English).
   - **PDF:** `pdfplumber` for digital document text extraction; automatic detection and flagging of scanned image-based PDFs for OCR.
   - **Translation:** `AI4Bharat IndicTrans2` (`ai4bharat/indictrans2-indic-en-1B` and `ai4bharat/indictrans2-en-indic-1B`) for bidirectional vernacular <-> English neural translation.
   - **Structured Fact Extraction:** `Qwen3-8B` via Ollama for zero-hallucination structured profiling (never invents missing information).
   - **Review & Edit Stage:** Allows beneficiaries to inspect and edit auto-filled fields before saving.
5. **Assessor Side-by-Side Verification:**
   - Side-by-side view presenting the original pitch (audio player, PDF viewer, or vernacular text) alongside the complete English translation.
   - Separate AI business profile and 8-domain scoring analysis for assessor technical review and scoring overrides.
6. **Concurrency-Safe Assessor Allocation:** Automatic allocation matching trade expertise, region, and available capacity. Unassigned cases enter a priority waiting queue with automated Admin Staffing Alerts.
7. **Strict Role Separation & Language Discipline:**
   - Clean welcome landing page at `/` with 3 role cards (Beneficiary, Assessor, Admin).
   - Beneficiary flow supports 7 Indian languages with persistent language choice and dynamic OTP verification.
   - Assessor and Admin portals are English-only.

---

## 2. End-to-End Workflow

```
Public Welcome Landing Page ("/")
  ├── Card 1: Aspiring Entrepreneur (Beneficiary)
  │     → Preferred Language Selection (English, हिन्दी, मराठी, తెలుగు, தமிழ், ಕನ್ನಡ, বাংলা)
  │     → Choice: Existing Beneficiary Login vs. New Beneficiary Register
  │     → Registration: Full Name, Mobile, State, District, Taluka/Block, Cohort, Consent
  │     → Dynamic OTP Verification (Dispatched OTP verification code)
  │     → Unique Reference ID (e.g., STRIVE-2024-MH-8492)
  │     → Empty Beneficiary Dashboard ("Submit Your Business Idea")
  │     → Pitch Pipeline: Text / Audio (faster-whisper) / PDF (pdfplumber)
  │     → AI4Bharat IndicTrans2 Translation to English
  │     → Qwen3-8B Fact Extraction (Auto-fill without inventing facts)
  │     → Review & Edit Auto-Filled Form Fields
  │     → Split-Screen Adaptive AI Mentoring & Live Business Profile
  │     → Beneficiary Answers Follow-Up Questions (Text/Audio/Guidance)
  │     → Profile Completeness >= 75% unlocks AI Preliminary Scoring
  │     → If Score < 7.0: AI Improvement Workspace (SWOT, similar ideas, verified competitors)
  │     → Reassessment Workflow (Version 1 vs Version 2)
  │     → When Ready: Submit to Human Assessor
  │
  ├── Card 2: Technical Assessor
  │     → English-Only Assessor Login (Admin-approved credentials)
  │     → Workload Capacity Gauge (Active vs Max Cases)
  │     → Side-by-Side Review: Original Pitch (Audio/PDF/Text) vs. Complete English Translation
  │     → Simplified AI 8-Domain Rubric Analysis
  │     → Rubric Score Overrides with Mandatory Justification
  │     → Clarification Requests or Final Sign-Off (Auto-translated to Beneficiary's Language)
  │
  └── Card 3: Program Directorate (Admin)
        → English-Only Admin Login
        → Directorate KPI Cards & Cohort Performance
        → Trade Distribution & 8-Domain Radar Charts
        → Concurrency-Safe Assessor Workload Management
        → Priority Waiting Queue & Staffing Alerts
        → Comprehensive Individual Assessment Report (Printable & Downloadable)
```

---

## 3. Local Model Setup & Dependencies

The backend is built with Python FastAPI and supports locally hosted, open-source models:

### 3.1 Python Requirements
Install dependencies in your Python virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3.2 Ollama & Qwen3-8B (Business Analysis LLM)
1. Install Ollama from [ollama.com](https://ollama.com).
2. Pull the model:
   ```bash
   ollama pull qwen3:8b
   ```
   *(Note: `qwen2.5:7b` can also be used as a drop-in alias by setting `OLLAMA_MODEL=qwen2.5:7b` in your environment).*
3. Ollama runs on `http://localhost:11434`.

### 3.3 faster-whisper (Audio Transcription)
`faster-whisper` runs locally via CTranslate2:
```bash
# Model size can be configured via environment variable (default: base)
export WHISPER_MODEL_SIZE=base
export WHISPER_DEVICE=cpu          # or 'cuda' for GPU acceleration
export WHISPER_COMPUTE_TYPE=int8   # or 'float16' for GPU
```

### 3.4 AI4Bharat IndicTrans2 (Translation)
IndicTrans2 provides 1B parameter neural translation models:
- Indic -> English: `ai4bharat/indictrans2-indic-en-1B`
- English -> Indic: `ai4bharat/indictrans2-en-indic-1B`

Models are cached automatically via HuggingFace Transformers when first invoked.

### 3.5 pdfplumber (PDF Document Extraction)
`pdfplumber` parses PDF text layout. In `backend/services/pdf_service.py`, if a PDF document contains fewer than 30 characters of extractable digital text (e.g. scanned image pages), the document is marked with `is_scanned=True` and `ocr_required=True` to prevent empty results.

---

## 4. Running the Platform

### Running the Web Application (Frontend)
```bash
npm run dev
```
The frontend dev server runs on `http://localhost:3000`.

### Running the FastAPI Backend
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger API documentation is available at `http://localhost:8000/docs`.

### API Pipeline Endpoints
- `POST /api/pipeline/process-audio` — Ingests audio, transcribes with faster-whisper, translates via IndicTrans2, and auto-fills profile via Qwen3-8B.
- `POST /api/pipeline/process-pdf` — Extracts text with pdfplumber (flags scanned PDFs for OCR), translates, and auto-fills profile.
- `POST /api/pipeline/process-text` — Translates vernacular text and auto-fills profile.
- `GET /api/pipeline/pitch/{pitch_id}` — Returns original pitch and complete English translation for assessor side-by-side view.
