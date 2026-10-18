# Regional typed-pitch demo

1. Choose the beneficiary's language and sign in.
2. Choose My idea and type or paste the pitch in that language. Source language defaults to the selected language; change it only when the text is in another language.
3. The title is optional. Audio and document input are under Other input options.
4. Submit Extract and review facts. The original text is retained and translated to English for extraction. Empty model claims remain missing fields.
5. Review the extracted facts. Answer missing details and contextual questions, then request the assessment.
6. The assigned assessor opens Original pitch to see original and English text side by side. Feedback and mentoring return in the beneficiary's selected display language.

Live verification uses scripts/verify_regional_text.py with temporary synthetic records and the local NLLB and Qwen services. It does not change real beneficiary records. Translation/extraction smoke tests are not a substitute for human review of regional-language meaning.
