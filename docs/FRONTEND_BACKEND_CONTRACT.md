# Frontend / backend contract

This documents the frontend's CURRENT expected contract. It is not a claim that the teammate's backend already matches. Adapt centrally before connecting; preserve existing business field IDs and submission IDs.

## Routing and identity

- Default browser base: /api.
- Vite proxy target: BACKEND_URL, an API origin such as http://HOST:8000 (no trailing /api).
- Optional direct browser API base: VITE_API_BASE_URL=https://HOST/api.
- All protected calls send Authorization: Bearer <account token>. No model/database secrets are sent by the frontend.
- GET /session returns {id, role, name?}; role is beneficiary, assessor or admin.
- GET /profile returns preferred_language plus optional updatedAt/name/region/cohortId.
- POST /profile accepts a partial preference update: {preferred_language}.
- Account roles, assignments, ownership and workflow eligibility MUST be enforced on the backend.

## Core record shape

GET /submissions returns an array, not a wrapper object. GET /submissions/{id} and mutating case actions return one full record:

~~~typescript
{
 id: string; owner: string; assessor: string | null;
 title: string; state: string; language: string;
 sources: Source[];
 facts: Record<string, Fact>;
 questions: Question[];
 maxQuestions: number;
 history: {state: string; at: string}[];
 // Optional:
 currentScore; provisionalScore; finalScore; financials;
 businessPlan; businessPlanTranslations; roadmap;
 recommendation; adminDecision; mediaIds; updatedAt;
}
~~~

A source includes id, original, english and language. The original must remain unchanged. Optional source metadata supplies explicit period/costBasis for structured financial inputs.

A fact includes field, value (string/null), status, claims, validation and confirmed. Each claim supplies value, evidence, source_id and explicit amount/currency/unit where available. Optional claim period and costBasis must be preserved.

validation is {valid: boolean, errors: string[]}. Status is PROVIDED, MISSING, UNCLEAR or CONFLICTING. PROVIDED means supported extraction, not beneficiary confirmation.

Questions include id, field, text, rationale, guidance, status and a translations map keyed by ISO language code. Answers remain original text. Guidance/rationale may be maps under localizedGuidance/localizedRationale.

## Stable business fields

The canonical list is exported as BUSINESS_MODULES / BUSINESS_FIELDS in src/services/businessForm.ts.

- overview: businessName, trade, productService, proposedLocation, businessStage
- market: targetCustomers, customerProblem, demandEvidence, competition, differentiation, salesChannels
- finance: initialInvestment, availableCapital, unitCost, sellingPrice, expectedSales, revenueAssumptions, monthlyExpenses, requestedFunding
- operations: equipment, suppliers, capacity, skills, staffing, distribution
- risk: marketRisks, financialRisks, operationalRisks, mitigation, compliance

Keys use module.field, for example finance.unitCost. Do not silently substitute snake_case names without an explicit adapter.

## Submission and fact review

| Method | Path below /api | Input |
|---|---|---|
| GET | /schema | returns {modules,critical} |
| GET | /cohorts | returns cohort array |
| POST | /pipeline/process-text | {title,text,language,input_type,interaction_language,media_ids} |
| POST | /pipeline/process-document | multipart file; returns {text,uploadId,pages?,reviewRequired} |
| POST | /pipeline/process-voice | multipart file + language; returns {original_transcript,uploadId,detected_language?} |
| GET | /media/{id} | authenticated original bytes |
| POST | /pipeline/process-structured | {title,language,region,trade,cohortId,fields} |
| POST | /submissions/{id}/fields | same structured shape; only changed fields included |
| POST | /submissions/{id}/confirm-fields | {fields: string[], rejected: string[]} |
| POST | /submissions/{id}/language | {language} |
| POST | /submissions/{id}/display | translates fact display values for the case language |

Structured fields contain value plus optional amount, currency, unit, period, costBasis and estimate. Amounts must agree with the original field text. costBasis is fixed, total or variable; period is month or once.

An erased prefilled value is sent as an explicit rejected field; it is not silently replaced with zero or an empty confirmed fact.

## Clarification, assessment and approval

| Method | Path below /api | Input |
|---|---|---|
| POST | /clarification/{id}/round | {} |
| POST | /clarification/{id}/answer | {question_id,answer,language,dont_know} |
| POST | /submissions/{id}/correction-question | {field} |
| POST | /submissions/{id}/extract | {} |
| POST | /submissions/{id}/ai-score | {} |
| POST | /submissions/{id}/finalize | {} |
| POST | /submissions/{id}/confirm | {} |
| POST | /submissions/{id}/submit-to-assessor | {} |
| POST | /submissions/{id}/escalate | {reason} |
| POST | /submissions/{id}/request-clarification | {reason} |
| POST | /submissions/{id}/human-answer | {task_id,evidence} |
| POST | /submissions/{id}/recommendation | {recommendation,reason,overrides} |
| POST | /admin/submissions/{id}/decision | {decision,reason} |

A score includes status, overallScore, completeness, confidence, feasibility, scoreMeaning, domains and optional stale. Each domain includes weight, rating, supportedFields and missingFields. Final AI scores use assessmentType=QWEN_EVIDENCE_RATING. Evidence-coverage values must not be passed off as AI ratings.

The current frontend guard assumes the project threshold 7/10; expose/configure a shared threshold if the backend changes it. Server-side validation remains authoritative.

## Plan, finances and roadmap

- POST /submissions/{id}/business-plan -> full record with businessPlan={sections,method,language}.
- POST /submissions/{id}/business-plan/edit accepts {sections}; current editing contract is English draft text.
- Financials contains calculations keyed by calculator name, warnings, assumptions and scenarios. Each calculation has amount, unit and formula. Financial arithmetic belongs on the backend.
- POST /submissions/{id}/roadmap -> full record.
- POST /submissions/{id}/roadmap/evidence accepts {task_id,evidence}.

## Dynamic localization: required language provenance

Supported language codes: en, hi, mr, te, ta, kn, bn. Keep interaction language independent from document/source language.

Already supported keyed displays:
- facts[field].displayValues[language]
- questions[].translations[language]
- reportTranslations[language]
- businessPlanTranslations[language]

The frontend additionally accepts these OPTIONAL, explicit language-tagged display fields:
- financialTranslations[language]
- roadmap[].translations[language] containing title, reason, instruction, evidenceNeeded; OR localizedLanguage plus localized
- recommendation.translations[language] (feedback text); OR feedbackLanguage plus feedbackTranslated
- adminDecision.translations[language] (explanation); OR explanationLanguage plus explanationTranslated
- humanQuestions[].translations[language]; OR targetLanguage plus translated

Do not attach a translated string without identifying its target language. If the target cannot be verified, the frontend displays original content with a pending-translation notice instead of presenting the wrong language as correct. Original evidence, reference IDs, names and numeric values remain intact.

## Admin and workload

- GET /admin/overview returns records, groups, cohorts, capacities, accounts, audit and counts.
- POST /admin/entities/{cohort|capacity|settings} accepts {id,data}.
- POST /admin/accounts accepts {id,role,name,assessor_id?}; generated token is a one-time private response.
- POST /admin/submissions/{id}/assign accepts {assessor_id,reason}.
- POST /admin/submissions/{id}/cohort accepts {id,data:{reason}}.
- POST /assessor/capacity accepts {id,data:{preferred,available}}.

The assessor receives only assigned cases. The Admin view must be backend-authorized and calculated from actual records.

## Failures and final verification

Return JSON errors with detail as a string or Pydantic validation list. Use 401/403 for auth, 409 for workflow conflicts, 422 for invalid input, and 503 for unavailable services. Never return fake extraction data or HTML with an HTTP-success status.

After mapping, verify: authentication; independently selected document/UI languages; actual text/PDF/audio input; evidence references; confirmation/correction; missing-field questions; current scores; plan; assessor ownership; Admin decision; translated beneficiary status; persistence after refresh. Static frontend checks do not prove model, OCR, voice or translation accuracy.


## Clarification and readiness scoring (updated)

The beneficiary screen must not display pitch extraction coverage as a readiness score. Extraction scores have `assessmentType: EVIDENCE_COVERAGE_NOT_AI_RATING`. A final readiness assessment requires answered clarification questions across all eight rubric categories, confirmed valid facts for those answers, confirmed critical facts, and no unresolved questions. A supplied pitch alone cannot satisfy this gate.

The frontend requests `/clarification/{id}/round` once after a newly extracted idea, displays actual service errors, and allows explicit retry. Rounds prioritize one question per unasked rubric category. Unknown answers remain unresolved. `/ai-score`, `/finalize`, `/confirm`, and `/submit-to-assessor` enforce the clarification gate on the server.

Qwen receives the original pitch, confirmed facts, and clarification answers. Supporting fields must belong to the rated category. Each category rating is capped by the proportion of its rubric fields actually cited as confirmed evidence; missing evidence cannot earn a full rating. The weighted total remains server calculated. Live model/translation verification still requires reachable configured services.

Malformed nested response data is rejected with a visible error before rendering. Unexpected rendering errors show reload/home recovery controls. These controls do not delete submissions.
