"""Local presentation authentication. Displayed OTPs NEVER grant access to the real database."""
import hashlib
import json
import os
import re
import secrets
import sqlite3
import time
from contextlib import contextmanager
from contextvars import ContextVar
from pathlib import Path
from typing import Literal
from fastapi import HTTPException, Request
from pydantic import BaseModel, Field

presentation_request = ContextVar("presentation_request", default=False)


def demo_path():
    root=Path(__file__).resolve().parents[1]
    chosen=os.getenv("DEMO_DATABASE_PATH", str(root / "presentation.sqlite3"))
    real=os.getenv("DATABASE_PATH",str(root / "screening.sqlite3"))
    if Path(chosen).resolve()==Path(real).resolve():raise HTTPException(503,"Presentation records must use a separate database")
    return chosen


@contextmanager
def demo_connection():
    db = sqlite3.connect(demo_path(), timeout=30)
    db.row_factory = sqlite3.Row
    db.execute("CREATE TABLE IF NOT EXISTS program_entities(kind TEXT NOT NULL,id TEXT NOT NULL,body TEXT NOT NULL,PRIMARY KEY(kind,id))")
    db.execute("CREATE TABLE IF NOT EXISTS phone_challenges(id TEXT PRIMARY KEY,phone TEXT,role TEXT,mode TEXT,name TEXT,language TEXT,code_hash TEXT,created REAL,expires REAL,attempts INTEGER,used INTEGER)")
    db.execute("CREATE TABLE IF NOT EXISTS phone_sessions(token_hash TEXT PRIMARY KEY,account_id TEXT,expires REAL)")
    try:
        with db:
            yield db
    finally:
        db.close()


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def identity(token):
    if not token.startswith("presentation_"):
        return None
    with demo_connection() as db:
        row = db.execute("SELECT p.body FROM phone_sessions s JOIN program_entities p ON p.kind='account' AND p.id=s.account_id WHERE s.token_hash=? AND s.expires>?", (digest(token), time.time())).fetchone()
    if row:
        account = json.loads(row[0])
        if account.get("active"):
            return {k:account[k] for k in ("id","name","role")} | {"presentation":True}
    return None


def phone_number(value):
    compact = re.sub(r"[ ()-]", "", value.strip())
    if re.fullmatch(r"[6-9][0-9]{9}", compact):
        compact = "+91" + compact
    if not re.fullmatch(r"\+[1-9][0-9]{7,14}", compact):
        raise HTTPException(422, "Enter a valid 10-digit Indian mobile number or a number with country code")
    return compact


class OtpRequest(BaseModel):
    phone:str=Field(min_length=8,max_length=30)
    role:Literal["beneficiary","assessor","admin"]
    mode:Literal["login","register"]="login"
    name:str=Field(default="",max_length=200)
    language:str="en"


class OtpVerify(BaseModel):
    challenge_id:str=Field(min_length=1,max_length=100)
    otp:str=Field(pattern=r"^[0-9]{6}$")


def install_phone_auth(app, runtime):
    @app.middleware("http")
    async def presentation_scope(request:Request, call_next):
        token=request.headers.get("authorization", "").removeprefix("Bearer ")
        flag=presentation_request.set(request.url.path.startswith("/api/auth/") or token.startswith("presentation_"))
        try:
            return await call_next(request)
        finally:
            presentation_request.reset(flag)

    def local_demo(request):
        if os.getenv("PRESENTATION_PHONE_LOGIN", "true").lower()!="true":
            raise HTTPException(503,"Presentation login is disabled")
        if request.client.host not in ("127.0.0.1","::1","localhost","testclient"):
            raise HTTPException(403,"On-screen OTP login is available only on the local presentation server")

    @app.post("/api/auth/request-otp")
    def request_otp(req:OtpRequest, request:Request):
        local_demo(request)
        phone=phone_number(req.phone)
        if req.mode=="register" and not req.name.strip():
            raise HTTPException(422,"Enter your full name")
        if req.language not in runtime["LANGUAGES"]:
            raise HTTPException(422,"Unsupported language")
        account_id=req.role+"_"+digest(phone)[:24]
        stamp=time.time()
        with demo_connection() as db:
            db.execute("BEGIN IMMEDIATE")
            existing=db.execute("SELECT body FROM program_entities WHERE kind='account' AND id=?",(account_id,)).fetchone()
            if req.mode=="login" and not existing:raise HTTPException(404,"Phone number not registered for this role. Choose Register first.")
            if req.mode=="register" and existing:raise HTTPException(409,"This phone number is already registered for this role. Choose Sign in.")
            recent=db.execute("SELECT MAX(created),COUNT(*) FROM phone_challenges WHERE phone=? AND role=? AND created>?",(phone,req.role,stamp-3600)).fetchone()
            if recent[0] and stamp-recent[0]<30:raise HTTPException(429,"Please wait 30 seconds before requesting another OTP")
            if recent[1]>=15:raise HTTPException(429,"Too many OTP requests. Please try again later")
            db.execute("UPDATE phone_challenges SET used=1 WHERE phone=? AND role=?",(phone,req.role))
            challenge=secrets.token_urlsafe(24)
            code=str(secrets.randbelow(1000000)).zfill(6)
            db.execute("INSERT INTO phone_challenges VALUES(?,?,?,?,?,?,?,?,?,?,?)",(challenge,phone,req.role,req.mode,req.name.strip(),req.language,digest(challenge+code),stamp,stamp+300,0,0))
        return {"challenge_id":challenge,"demo_otp":code,"expires_in":300,"resend_after":30,"presentation":True}

    @app.post("/api/auth/verify-otp")
    def verify_otp(req:OtpVerify, request:Request):
        local_demo(request)
        with demo_connection() as db:
            db.execute("BEGIN IMMEDIATE")
            row=db.execute("SELECT * FROM phone_challenges WHERE id=?",(req.challenge_id,)).fetchone()
            if not row or row["used"] or row["expires"]<=time.time():raise HTTPException(401,"OTP expired or already used. Request a new OTP.")
            if row["attempts"]>=5:raise HTTPException(429,"Too many attempts. Request a new OTP.")
            db.execute("UPDATE phone_challenges SET attempts=attempts+1 WHERE id=?",(req.challenge_id,))
            if not secrets.compare_digest(row["code_hash"],digest(req.challenge_id+req.otp)):
                db.commit()
                raise HTTPException(401,"Incorrect OTP. Please try again.")
            account_id=row["role"]+"_"+digest(row["phone"])[:24]
            found=db.execute("SELECT body FROM program_entities WHERE kind='account' AND id=?",(account_id,)).fetchone()
            if found:
                user=json.loads(found[0])
            elif row["mode"]=="register":
                user={"id":account_id,"name":row["name"],"role":row["role"],"phone":row["phone"],"active":True,"presentation":True}
                db.execute("INSERT INTO program_entities VALUES('account',?,?)",(account_id,json.dumps(user)))
                profile={"id":account_id,"name":row["name"],"preferred_language":row["language"]}
                db.execute("INSERT INTO program_entities VALUES('profile',?,?)",(account_id,json.dumps(profile)))
            else:raise HTTPException(401,"Account not found. Please register.")
            if not user.get("active",True):raise HTTPException(403,"This account is inactive")
            token="presentation_"+secrets.token_urlsafe(32)
            db.execute("INSERT INTO phone_sessions VALUES(?,?,?)",(digest(token),account_id,time.time()+43200))
            db.execute("UPDATE phone_challenges SET used=1 WHERE id=?",(req.challenge_id,))
        return {"session_token":token,"user":{k:user[k] for k in ("id","role","name")},"presentation":True}

    @app.post("/api/auth/logout")
    def logout(request:Request):
        token=request.headers.get("authorization", "").removeprefix("Bearer ")
        with demo_connection() as db:db.execute("DELETE FROM phone_sessions WHERE token_hash=?",(digest(token),))
        return {"ok":True}

    runtime["phone_auth"]=identity
