"""Local operator utility. Never imports the web app or contacts remote services."""
import argparse
import json
import re
import secrets
from pathlib import Path
from dotenv import dotenv_values

def main():
    parser = argparse.ArgumentParser(description="Provision or rotate a screening account token")
    parser.add_argument("--id", required=True)
    parser.add_argument("--role", choices=["beneficiary", "assessor", "admin"], required=True)
    parser.add_argument("--assessor-id")
    args = parser.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", args.id):
        parser.error("Use a 1-80 character identifier containing letters, digits, underscores or hyphens")
    path = Path(__file__).parent / ".env"
    existing = path.read_text(encoding="utf-8") if path.exists() else (path.parent / ".env.example").read_text(encoding="utf-8")
    accounts = json.loads(dotenv_values(path).get("SCREENING_ACCOUNTS") or "{}") if path.exists() else {}
    if args.role == "beneficiary" and (not args.assessor_id or not any(a.get("role") == "assessor" and a.get("id") == args.assessor_id for a in accounts.values())):
        parser.error("Provision the assessor first, then provide its --assessor-id")
    # Rotation invalidates previous tokens for this identity.
    accounts = {token: account for token, account in accounts.items() if not (account["id"] == args.id and account["role"] == args.role)}
    token = secrets.token_urlsafe(32)
    account = {"id": args.id, "role": args.role}
    if args.assessor_id:
        account["assessor_id"] = args.assessor_id
    accounts[token] = account
    line = "SCREENING_ACCOUNTS='" + json.dumps(accounts, separators=(",", ":")) + "'"
    if re.search(r"^SCREENING_ACCOUNTS=.*$", existing, flags=re.M):
        updated = re.sub(r"^SCREENING_ACCOUNTS=.*$", lambda _: line, existing, flags=re.M)
    else:
        updated = existing.rstrip() + "\n" + line + "\n"
    path.write_text(updated, encoding="utf-8")
    print("Account configured. Keep this token private and restart the backend:")
    print(token)

if __name__ == "__main__":
    main()
