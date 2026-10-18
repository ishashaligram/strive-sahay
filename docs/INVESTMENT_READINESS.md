# Beneficiary progress and investment review

Administrator: /admin/dashboard → Training, mentoring & investment readiness.

1. Set minimum final assessment score (0–10), training completion (0–100%) and mentoring completion (0–100%). Defaults: 7, 70%, 70%.
2. Open a beneficiary to see reviewer feedback, evidence, completion and the complete progress history.
3. The assigned assessor can submit trainer/mentor progress from their case screen. Administrators may record updates on behalf of a named trainer or mentor. Every entry retains the actual signed-in author, role and time; it is not represented as a direct trainer login.
4. Funding-review eligibility requires all three limits, a current final Qwen assessment and an investment-readiness recommendation from the assigned assessor. Synthetic examples cannot qualify. Existing return/rejection decisions must be resolved.
5. Administrators explicitly record eligibility or return for improvement with a reason. Passing limits alone never marks someone eligible. Changes to the case or limits require a new eligibility review; the old decision remains in audit history.

This is internal programme eligibility for funding review, not a grant approval, lender eligibility determination or transfer of funds. Reported completion percentages are human-entered with supporting notes, not inferred from AI scores or beneficiary self-reports.

Backend APIs:
- GET /api/admin/investment-readiness
- POST /api/admin/investment-readiness/limits
- POST /api/submissions/{sid}/programme-progress
- POST /api/admin/submissions/{sid}/investment-review
