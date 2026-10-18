"""Local document/model API gateway. Readiness is distinct from server availability."""
import asyncio,os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent/".env")
from fastapi import FastAPI,UploadFile,File,Form,HTTPException
from pydantic import BaseModel,Field
from services.local_ocr import extract_pdf,ready as ocr_ready
from services.local_indictrans import translate as indic_translate,CACHE
from services.indictrans_service import LANGUAGES,numbers
OCR_LIMIT=asyncio.Semaphore(1)
app=FastAPI(title='STRIVE SAHAY local OCR and model APIs',version='1.0')
class Translation(BaseModel):
    text:str=Field(min_length=1,max_length=40000)
    source_language:str
    target_language:str
    model:str|None=None
@app.get('/health')
async def health():
    import httpx
    qwen=False
    try:
        async with httpx.AsyncClient(timeout=2) as client:
            response=await client.get(os.getenv('QWEN_ENDPOINT','http://127.0.0.1:11434').rstrip('/')+'/api/tags')
            qwen=response.is_success and any(m.get('name')==os.getenv('QWEN_MODEL','qwen3:8b') for m in response.json().get('models',[]))
    except httpx.HTTPError:pass
    return {'server':'running','ocr':{'ready':ocr_ready(),'provider':'local-tesseract'},'indictrans2':{'ready':{'to_en','from_en'}.issubset(CACHE),'loadedDirections':list(CACHE),'modelAccessConfigured':bool(os.getenv('HF_TOKEN') or os.getenv('INDICTRANS_LOCAL_TO_EN'))},'qwen':{'ready':qwen,'model':os.getenv('QWEN_MODEL','qwen3:8b')}}
@app.post('/ocr')
async def ocr(file:UploadFile=File(...),language:str=Form('auto')):
    if language!='auto' and language not in LANGUAGES:raise HTTPException(422,'Unsupported OCR language')
    data=await file.read(15*1024*1024+1)
    if len(data)>15*1024*1024:raise HTTPException(413,'PDF exceeds 15 MB')
    if not data.startswith(b'%PDF'):raise HTTPException(415,'Upload a PDF document')
    try:
        async with OCR_LIMIT:return await asyncio.to_thread(extract_pdf,data,language)
    except (RuntimeError,ValueError) as exc:raise HTTPException(503,str(exc)) from exc
@app.post('/translate')
async def translate(req:Translation):
    if req.source_language not in LANGUAGES.values() or req.target_language not in LANGUAGES.values():raise HTTPException(422,'Unsupported translation language')
    try:
        result=await asyncio.to_thread(indic_translate,req.text,req.source_language,req.target_language)
        if sorted(numbers(req.text))!=sorted(numbers(result)):raise ValueError('Translation changed numeric quantities; source review required')
        return {'translated_text':result,'provider':'IndicTrans2'}
    except (RuntimeError,ValueError) as exc:raise HTTPException(503,str(exc)) from exc
@app.post('/transcribe')
async def transcribe(file:UploadFile=File(...),language:str=Form('auto')):
    from services.whisper_service import FasterWhisperService
    data=await file.read(15*1024*1024+1)
    if len(data)>15*1024*1024:raise HTTPException(413,'Recording exceeds 15 MB')
    try:return await asyncio.to_thread(FasterWhisperService.transcribe_local,data,language,file.filename or 'recording.webm')
    except (RuntimeError,ValueError) as exc:raise HTTPException(503,str(exc)) from exc
