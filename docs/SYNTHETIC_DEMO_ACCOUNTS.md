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
