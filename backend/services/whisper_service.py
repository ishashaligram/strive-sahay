import os
import tempfile

class FasterWhisperService:
    _model = None

    @classmethod
    def transcribe(cls, audio_bytes, language=None):
        try:
            from faster_whisper import WhisperModel
        except ImportError as exc:
            raise RuntimeError("Voice recognition is unavailable. Install faster-whisper in the backend environment, or enter text.") from exc
        if cls._model is None:
            cls._model = WhisperModel(os.getenv("WHISPER_MODEL_SIZE", "base"), device=os.getenv("WHISPER_DEVICE", "cpu"), compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "int8"))
        path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
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
