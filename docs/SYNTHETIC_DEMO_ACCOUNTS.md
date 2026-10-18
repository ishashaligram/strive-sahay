# Synthetic demonstration accounts

These are fictional cases in `presentation.sqlite3`, separate from real records. All scores are predefined illustrations, not model-generated assessments. The phone numbers are reserved fictional North American examples; no SMS is sent. Choose **Sign in**, enter the full number including `+1`, and use the OTP displayed on screen.

| Beneficiary | Phone | Pitch | Illustrative score |
| --- | --- | --- | --- |
| Asha Demo | +12025550101 | School uniform tailoring | 8.2/10 |
| Ravi Demo | +12025550102 | Home tiffin service | 7.4/10 |
| Meena Demo | +12025550103 | Handmade soap workshop | 6.1/10 |
| Kabir Demo | +12025550104 | Mobile phone repair | 5.0/10 |
| Lata Demo | +12025550105 | Millet snack stall | 3.8/10 |

Assessor: **+12025550110**, via `/assessor/login`.

Program manager: **+12025550119**, via `/admin/login`. This account can see all five synthetic cases in the case table.

Existing accounts can also view the examples through the corresponding staff queues when their permissions/assignment allow it. A beneficiary sees only their own submissions, so sign out and use one of the fictional beneficiary accounts to inspect its case.

The seed script is `scripts/seed_synthetic_demo.py`. Running it again does not overwrite existing accounts or case edits. Model weights, database files, OTPs and sessions are not committed to Git.

## Assessor analysis examples

Run `python scripts/seed_assessor_demo.py` with the project runtime to append five fictional cases to each existing presentation assessor account. The script writes only to the presentation database, uses stable case IDs and does not overwrite existing cases. Rerunning does not duplicate cases.

At `/assessor/dashboard`, click Refresh progress to load the examples. My assigned case analysis shows queue counts, a synthetic-score average separate from actual final assessments, and training/mentoring completion. Cases cover SUBMITTED, ADMIN_REVIEW, PROGRAM_DECIDED, CLARIFICATION_REQUIRED and AWAITING_BENEFICIARY. All example pitches, scores and progress are synthetic and cannot establish funding eligibility.

New assessor accounts created after seeding need the script rerun. The separate Synthetic Demo Assessor account retains its original fixture cases; the appended examples target the other existing assessor accounts.
