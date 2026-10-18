"""Adapter for an explicitly deployed IndicTrans2 gateway."""
import os
import re
import unicodedata
import httpx

LANGUAGES = {"en": "eng_Latn", "hi": "hin_Deva", "mr": "mar_Deva", "ta": "tam_Taml", "te": "tel_Telu", "kn": "kan_Knda", "bn": "ben_Beng"}

def numbers(text):
    text = "".join(str(unicodedata.digit(c)) if c.isdigit() else c for c in text)
    return re.findall(r"\d+(?:\.\d+)?", text.replace(",", ""))

class IndicTransService:
    @staticmethod
    async def translate(text, source, target):
        if source == target:
            return text
        if source not in LANGUAGES or target not in LANGUAGES:
            raise ValueError("Unsupported language")
        endpoint = os.getenv("INDICTRANS_ENDPOINT")
        if not endpoint:
            raise RuntimeError("Configure INDICTRANS_ENDPOINT with an IndicTrans2 translation gateway")
        headers = {"Authorization": "Bearer " + os.environ["INDICTRANS_API_KEY"]} if os.getenv("INDICTRANS_API_KEY") else {}
        async with httpx.AsyncClient(timeout=float(os.getenv("AI_TIMEOUT", "180"))) as client:
            r = await client.post(endpoint, headers=headers, json={"text": text, "source_language": LANGUAGES[source], "target_language": LANGUAGES[target], "model": os.getenv("INDICTRANS_EN_INDIC_MODEL", "ai4bharat/indictrans2-en-indic-1B") if source == "en" else os.getenv("INDICTRANS_INDIC_EN_MODEL", "ai4bharat/indictrans2-indic-en-1B")})
            r.raise_for_status()
            translated = r.json()["translated_text"]
        if not isinstance(translated, str) or not translated.strip():
            raise ValueError("Translation returned empty text")
        if sorted(numbers(text)) != sorted(numbers(translated)):
            raise ValueError("Translation changed numeric quantities; review source language and retry")
        return translated
