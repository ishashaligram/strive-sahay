import os
import tempfile
import httpx
import mimetypes
from pathlib import Path

class FasterWhisperService:
    _model = None

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
        if language=='or':raise RuntimeError('Odia audio requires an ASR_ENDPOINT configured for Odia. No transcript has been invented.')
        try:
            from faster_whisper import WhisperModel
        except ImportError as exc:
            raise RuntimeError("Voice recognition is unavailable. Install faster-whisper in the backend environment, or enter text.") from exc
        if cls._model is None:
            cls._model = WhisperModel(os.getenv("WHISPER_MODEL_SIZE", "base"), device=os.getenv("WHISPER_DEVICE", "cpu"), compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "int8"))
        path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=Path(filename).suffix if Path(filename).suffix.lower() in (".mp4",".ogg",".wav",".mp3",".m4a",".flac",".webm") else ".webm", delete=False) as f:
                f.write(audio_bytes)
                path = f.name
            segments, info = cls._model.transcribe(path, language=None if language in (None, "auto") else language, vad_filter=True)
            text = " ".join(s.text.strip() for s in segments)
            if not text.strip():
                raise ValueError("No speech detected; record again or enter text")
            return {"original_transcript": text, "detected_language": info.language, "confidence": info.language_probability}
        finally:
            if path:
                os.unlink(path)
