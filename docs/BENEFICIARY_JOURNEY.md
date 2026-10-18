# Simplified beneficiary journey

The public homepage offers one beneficiary entry. Staff keep separate routes: `/assessor/login` and `/admin/login`.

The beneficiary has four steps: idea, basic questionnaire, contextual AI questions, and result. The basic questionnaire shows one field at a time, prefills supported facts, keeps financial estimates explicit, and requires review before submission. Unknown answers remain unresolved. The final readiness score still requires confirmed critical facts and answers across eight domains.

Results provide the score, Qwen-generated SWOT, a grounded AI business-plan draft, local-market research tasks and next steps. No live local-demand or price feed is available, so market guidance is labelled as research to perform. Reassessment creates a new submission linked to the prior attempt and lists fields from weak or incomplete domains. Prior scores and human decisions are preserved.

The interface, question responses, plan and guidance use the selected app language through the configured translation service. Translation failures remain visible; selecting a language does not guarantee a correct translation. Voice answers go through the existing real transcription service and remain editable before saving.

Read aloud uses a matching browser voice when available, otherwise the local Meta MMS text-to-speech models. Text is read in chunks and playback can be stopped. Digits are expanded for audible numeric scores. All eight local language models produced non-empty audio during smoke testing; pronunciation and long-page quality still require human evaluation. First model loading can take longer. Install voice weights with `scripts/setup_language_models.py --tts` and the speech requirements. Keep the original MMS non-commercial license terms with the deployment.

The support sidebar links to official/resource-provider pages, checked on 2026-10-18:
- [myScheme](https://www.myscheme.gov.in/search)
- [PMEGP application portal](https://www.kviconline.gov.in/pmegpeportal/jsp/pmegponline.jsp)
- [Udyam official registration](https://udyamregistration.gov.in/)
- [deAsra Foundation](https://www.deasra.in/about-us/)
- [SEWA](https://www.sewa.org/)

These are information and eligibility links, not verified beneficiary matches, grants or funding approvals. Neither the UI nor the model should promise that a particular applicant qualifies.
