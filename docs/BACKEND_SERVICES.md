# Local backend services

The application API runs at http://127.0.0.1:8000/docs. It includes phone registration/login, submissions, document/text/audio processing, missing-field confirmation, category questions, scoring, assessor and program-manager operations. The local processing gateway runs at http://127.0.0.1:8001/docs:

| API | Input | Actual dependency |
| --- | --- | --- |
| POST /ocr | PDF multipart `file`, `language` (ISO code or auto) | Local Tesseract.js and eight downloaded OCR language files |
| POST /translate | JSON `text`, `source_language`, `target_language` (IndicTrans codes) | Official IndicTrans2 models and model runtime |
| POST /transcribe | Audio multipart `file`, `language` | faster-whisper runtime and weights; Odia requires a separate supported ASR adapter |
| GET /health | None | Reports server availability separately from model readiness |

## Start

Install frontend dependencies, then backend requirements in a Python environment. Run `python scripts/setup_ocr.py` once to download the official OCR language data. Copy `backend/.env.example` to `backend/.env`, keeping private credentials there. Start both APIs with:

```powershell
.\scripts\start_backend_services.ps1 -PythonExecutable 'C:\path\to\python.exe'
```

Existing listeners are retained. Logs are written under ignored `output/backend`. Open both `/docs` pages to inspect exact request/response schemas. Application status is `/api/health` on port 8000; processing readiness is `/health` on port 8001. Starting a server does not install model weights.

## Model setup still required

### Lightweight presentation model

This machine now has the official Qwen2.5-1.5B-Instruct Q4_K_M pretrained model running in llama.cpp on port 8080. It replaces the unavailable 8B runtime for local presentation use. Configuration in the private environment is `QWEN_PROVIDER=openai`, `QWEN_ENDPOINT=http://127.0.0.1:8080/v1`, `QWEN_MODEL=local-business-1.5b`. Restart with `scripts/start_local_llm.ps1`. Weights are ignored, not committed. Source: https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF and https://github.com/ggml-org/llama.cpp/releases/tag/b11717. Smaller model accuracy is limited; source evidence validation remains enabled. This does not install IndicTrans2 or speech models.

For Qwen, install Ollama, run `ollama pull qwen3:8b`, and start its server on port 11434. Keep enough free memory for inference. Alternatively configure `QWEN_PROVIDER`, `QWEN_ENDPOINT`, `QWEN_MODEL` and optional `QWEN_API_KEY` for an accessible compatible server. No paid API key is required for a locally hosted model.

For IndicTrans2, use a separate Python 3.11 environment with `backend/requirements-models.txt`. Obtain access to both official AI4Bharat distilled model repositories on Hugging Face and put `HF_TOKEN` in the private environment, or set `INDICTRANS_LOCAL_TO_EN` and `INDICTRANS_LOCAL_FROM_EN` to approved downloaded model directories. Run the gateway using that environment. The model revisions are pinned in `backend/services/local_indictrans.py`. Indic-to-Indic translation pivots through English. Numbers are checked after translation; missing model access returns an explicit service error.

For speech, install the backend requirements including faster-whisper and allow the configured Whisper weights to download. An external multilingual ASR can instead be configured with `ASR_ENDPOINT`; avoid pointing the gateway's local transcription implementation back to itself.

OCR was tested against a supplied Telugu form with a real HTTP request. Qwen inference, speech inference and IndicTrans2 translation require their respective runtime/models; they must not be represented as verified until an actual inference succeeds. No sample business facts are substituted on failure.
