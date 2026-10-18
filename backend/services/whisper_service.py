import os
import tempfile
import httpx
import mimetypes
import threading
from pathlib import Path

class FasterWhisperService:
    _model = None
    _lock = threading.Lock()

    @classmethod
    def transcribe(cls, audio_bytes, language=None, filename="recording.webm"):
        endpoint=os.getenv('ASR_ENDPOINT')
        if endpoint:
            headers={'Authorization':'Bearer '+os.environ['ASR_API_KEY']} if os.getenv('ASR_API_KEY') else {}
            response=httpx.post(endpoint,headers=headers,files={'file':(Path(filename).name,audio_bytes,mimetypes.guess_type(filename)[0] or 'application/octet-stream')},data={'language':language or 'auto'},timeout=float(os.getenv('AI_TIMEOUT','180')))
            response.raise_for_status()
            result=response.json()
            if not isinstance(result.get('original_transcript'),str) or not result['original_transcript'].strip():raise ValueError('Speech service returned no transcript')
            return {**result,'reviewRequired':True}
        return cls.transcribe_local(audio_bytes,language,filename)

    @classmethod
    def transcribe_local(cls,audio_bytes,language=None,filename='recording.webm'):
        if language=='or':
            from services.local_odia import transcribe
            return transcribe(audio_bytes)
        try:
            from faster_whisper import WhisperModel
        except ImportError as exc:
            raise RuntimeError("Voice recognition is unavailable. Install faster-whisper in the backend environment, or enter text.") from exc
        path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=Path(filename).suffix if Path(filename).suffix.lower() in (".mp4",".ogg",".wav",".mp3",".m4a",".flac",".webm") else ".webm", delete=False) as f:
                f.write(audio_bytes)
                path = f.name
            with cls._lock:
                if cls._model is None:
                    local=Path(__file__).resolve().parents[2]/'.runtime-models/whisper-small'
                    model_path=str(local) if (local/'model.bin').is_file() else os.getenv('WHISPER_MODEL_SIZE','small')
                    cls._model=WhisperModel(model_path,device=os.getenv('WHISPER_DEVICE','cpu'),compute_type=os.getenv('WHISPER_COMPUTE_TYPE','int8'),cpu_threads=int(os.getenv('MODEL_CPU_THREADS','4')))
                segments, info = cls._model.transcribe(path, language=None if language in (None, "auto") else language, vad_filter=True,beam_size=2)
                text = " ".join(s.text.strip() for s in segments)
            if not text.strip():
                raise ValueError("No speech detected; record again or enter text")
            return {"original_transcript": text, "detected_language": info.language, "confidence": info.language_probability}
        finally:
            if path:
                os.unlink(path)
