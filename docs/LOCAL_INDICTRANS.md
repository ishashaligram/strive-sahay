# Local IndicTrans2 activation

The Windows CPU runtime is prepared using an official pinned pure-Python IndicTransToolkit revision. The current PyPI toolkit requires a C++ compiler on Windows; the pinned source avoids that requirement.

Before downloading, the Hugging Face account must have access to both models:
- https://huggingface.co/ai4bharat/indictrans2-en-indic-dist-200M
- https://huggingface.co/ai4bharat/indictrans2-indic-en-dist-200M

Save a Hugging Face read token as HF_TOKEN in backend/.env. Never put it in source control, frontend code or a chat message.

With the project's Python executable and PYTHONPATH set to .runtime-python plus backend, run:

    python scripts/setup_indictrans_local.py --activate

The script downloads official pinned checkpoints to .runtime-models, translates a synthetic tailoring sentence with a financial quantity in both directions for Hindi, Marathi, Telugu, Tamil, Kannada, Bengali and Odia, and checks that numeric quantities are preserved. This is a smoke check, not a human quality evaluation.

It changes the provider only after all 14 translations pass, then the APIs must be restarted. Results are written under ignored output/. The previous NLLB provider remains configured when credentials are absent or checks fail.

Windows packaging note: use setuptools<81 as a pip build constraint for the pinned toolkit source because its setup script imports pkg_resources. Dependencies are listed in backend/requirements-indictrans-windows.txt. Keep model runtime dependencies isolated from the system Python.
