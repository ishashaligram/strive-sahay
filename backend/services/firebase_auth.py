"""Firebase ID-token verification and Firestore-backed beneficiary provisioning.

Firebase Admin credentials must be provided by GOOGLE_APPLICATION_CREDENTIALS or
Application Default Credentials. Never place service-account JSON in the repo.
"""
import os
from typing import Any


class FirebaseNotConfigured(RuntimeError):
    """Firebase Admin SDK or server credentials are not configured."""


class FirebaseAuthError(Exception):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code


def _firebase_modules():
    try:
        import firebase_admin
        from firebase_admin import auth as firebase_auth
        from firebase_admin import credentials, firestore
    except ImportError as exc:
        raise FirebaseNotConfigured(
            "Firebase backend dependency is missing. Install requirements.txt."
        ) from exc

    project_id = os.getenv("FIREBASE_PROJECT_ID", "").strip()
    if not project_id:
        raise FirebaseNotConfigured("Set FIREBASE_PROJECT_ID in backend/.env.")

    try:
        app = firebase_admin.get_app()
    except ValueError:
        credential_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
        try:
            credential = (
                credentials.Certificate(credential_path)
                if credential_path
                else credentials.ApplicationDefault()
            )
            app = firebase_admin.initialize_app(credential, {"projectId": project_id})
        except Exception as exc:
            raise FirebaseNotConfigured(
                "Firebase Admin credentials are unavailable. Configure GOOGLE_APPLICATION_CREDENTIALS or Application Default Credentials."
            ) from exc

    return firebase_admin, firebase_auth, firestore, app


def verify_firebase_token(token: str) -> dict[str, Any]:
    _admin, firebase_auth, _firestore, app = _firebase_modules()
    try:
        return firebase_auth.verify_id_token(token, app=app, check_revoked=True)
    except Exception as exc:
        raise FirebaseAuthError(401, "Invalid or expired Firebase ID token.") from exc


def authenticate_firebase_token(token: str) -> dict[str, str]:
    _admin, _firebase_auth, firestore, app = _firebase_modules()
    decoded = verify_firebase_token(token)
    uid = str(decoded.get("uid", ""))
    if not uid:
        raise FirebaseAuthError(401, "Firebase token has no user ID.")

    snapshot = firestore.client(app=app).collection("users").document(uid).get()
    if not snapshot.exists:
        raise FirebaseAuthError(
            403,
            "No STRIVE SAHAY role is assigned to this Firebase account. Register as a beneficiary or contact the administrator.",
        )

    profile = snapshot.to_dict() or {}
    role = profile.get("role")
    if role not in ("beneficiary", "assessor", "admin"):
        raise FirebaseAuthError(403, "This Firebase account has no valid portal role.")
    if profile.get("active") is not True:
        raise FirebaseAuthError(403, "This STRIVE SAHAY account is inactive.")

    return {
        "id": uid,
        "role": role,
        "name": str(profile.get("name") or profile.get("fullName") or decoded.get("name") or decoded.get("email") or uid),
    }


def register_beneficiary_account(token: str, display_name: str, preferred_language: str) -> dict[str, str]:
    _admin, _firebase_auth, firestore, app = _firebase_modules()
    decoded = verify_firebase_token(token)
    uid = str(decoded.get("uid", ""))
    email = str(decoded.get("email", "")).strip().lower()
    if not uid or not email:
        raise FirebaseAuthError(400, "A Firebase email/password account is required for beneficiary registration.")

    db = firestore.client(app=app)
    user_ref = db.collection("users").document(uid)
    profile_ref = db.collection("beneficiaries").document(uid)
    existing = user_ref.get()
    if existing.exists:
        profile = existing.to_dict() or {}
        if profile.get("role") == "beneficiary" and profile.get("active") is True:
            return {"id": uid, "role": "beneficiary", "name": str(profile.get("name") or display_name)}
        raise FirebaseAuthError(409, "This Firebase account is already assigned to another role or is inactive.")

    timestamp = firestore.SERVER_TIMESTAMP
    batch = db.batch()
    batch.set(user_ref, {
        "uid": uid,
        "role": "beneficiary",
        "active": True,
        "name": display_name.strip(),
        "email": email,
        "preferred_language": preferred_language,
        "createdAt": timestamp,
        "authProvider": "firebase",
    })
    batch.set(profile_ref, {
        "uid": uid,
        "fullName": display_name.strip(),
        "email": email,
        "preferredLanguage": preferred_language,
        "createdAt": timestamp,
    })
    try:
        batch.commit()
    except Exception as exc:
        raise FirebaseAuthError(503, "Could not save the beneficiary profile to Firestore. Retry registration.") from exc

    return {"id": uid, "role": "beneficiary", "name": display_name.strip()}
