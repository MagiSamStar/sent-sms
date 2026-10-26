import os
import phonenumbers
import secrets
import hashlib
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from fastapi import Depends, FastAPI, HTTPException, Request
from sqlalchemy import DateTime, Integer, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from phonenumbers import PhoneNumberFormat
from dotenv import load_dotenv
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from sent_dm import Sent
from pydantic import Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
# Load local environment variables from backend/.env
load_dotenv()

# Store the SQLite database in the backend folder.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'verification.db')}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


class PhoneValidationRequest(BaseModel):
    phone_number: str = Field(min_length=8, max_length=16)
    consent: bool
class OTPRequest(BaseModel):
    phone_number: str = Field(min_length=8, max_length=16)
    consent: bool
class HealthResponse(BaseModel):
    status: str
    app: str

app = FastAPI(
    title="Sent SMS Demo",
    description="A small portfolio project demonstrating the Sent messaging API.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["localhost:5173", "http://127.0.0.1:5173","https://sent-sms.vercel.app"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler,
)

class Base(DeclarativeBase):
    pass


def get_db():
    """Create a database session and close it when finished."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class VerifyCodeRequest(BaseModel):
    phone_number: str = Field(min_length=8, max_length=16)
    code: str = Field(pattern=r"^\d{6}$")

@app.post("/verify-code")
@limiter.limit("10/minute")
def verify_code(
    request_context: Request,
    request: VerifyCodeRequest,
    db: Session = Depends(get_db),
):
    """Verify a six-digit code for a phone number."""

    try:
        phone_number = validate_phone_number(request.phone_number)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    verification = (
        db.query(VerificationCode)
        .filter(
            VerificationCode.phone_number == phone_number,
            VerificationCode.verified.is_(False),
        )
        .order_by(VerificationCode.created_at.desc())
        .first()
    )

    if verification is None:
        raise HTTPException(
            status_code=400,
            detail="No pending verification was found.",
        )

    if is_code_expired(verification.expires_at):
        raise HTTPException(
            status_code=400,
            detail="This verification code has expired.",
        )

    if verification.attempts >= 5:
        raise HTTPException(
            status_code=429,
            detail="Too many attempts. Request a new code.",
        )

    if not secrets.compare_digest(
        verification.code_hash,
        hash_verification_code(request.code),
    ):
        verification.attempts += 1
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Incorrect verification code.",
        )

    verification.verified = True
    db.commit()

    return {"status": "verified", "message": "Phone number verified."}

def validate_phone_number(phone_number: str) -> str:
    """Validate an international phone number and return E.164 format."""

    try:
        parsed_number = phonenumbers.parse(phone_number, None)
    except phonenumbers.NumberParseException as exc:
        raise ValueError(
            "Enter a valid international phone number, including country code."
        ) from exc

    if not phonenumbers.is_valid_number(parsed_number):
        raise ValueError("Enter a valid phone number.")

    return phonenumbers.format_number(
        parsed_number,
        PhoneNumberFormat.E164,
    )

def generate_verification_code() -> str:
    """Generate a cryptographically secure six-digit verification code."""
    return f"{secrets.randbelow(1_000_000):06d}"


def send_verification_sms(phone_number: str, code: str) -> None:
    """Send a verification code using the Sent SMS template."""

    if os.getenv("SENT_ALLOW_REAL_SMS", "false").lower() != "true":
        raise RuntimeError("Real SMS sending is disabled.")

    api_key = os.getenv("SENT_DM_API_KEY")
    if not api_key:
        raise RuntimeError("SENT_DM_API_KEY is not configured.")

    client = Sent(api_key=api_key)

    
    client.messages.send(
    to=[phone_number],
    template={
        "id": "a13774f5-2313-4c59-837c-a26fabbb12b0",
        "parameters": {"var_1": code},
    },
    channel=["sms"],
    sandbox=False,
)



def hash_verification_code(code: str) -> str:
    """Return a SHA-256 hash of a verification code."""
    return hashlib.sha256(code.encode("utf-8")).hexdigest()

def is_code_expired(expires_at: datetime) -> bool:
    """Check whether a verification code has expired."""
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    return datetime.now(timezone.utc) >= expires_at

@app.post("/validate-phone")
def validate_phone(request: PhoneValidationRequest):
    try:
        normalized_number = validate_phone_number(request.phone_number)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    return {
        "valid": True,
        "phone_number": normalized_number,
    }


@app.post("/request-code")
@limiter.limit("5/minute")
def request_code(
    request_context: Request,
    request: OTPRequest,
    db: Session = Depends(get_db),
):
    """Prepare a verification code without sending an SMS yet."""

    # Require explicit consent before preparing an SMS verification.
    if not request.consent:
        raise HTTPException(
            status_code=400,
            detail="Consent is required to request a verification SMS.",
        )

    # Validate and normalize the phone number.
    try:
        phone_number = validate_phone_number(request.phone_number)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    # Generate a code, but store only its hash.
    code = generate_verification_code()
    code_hash = hash_verification_code(code)

    # Set the code to expire in 10 minutes.
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    verification = VerificationCode(
        phone_number=phone_number,
        code_hash=code_hash,
        expires_at=expires_at,
    )

    db.add(verification)
    db.commit()
    db.refresh(verification)

    try:
        send_verification_sms(phone_number, code)
    except Exception as exc:
        print(f"Sent SMS error: {type(exc).__name__}: {exc}")

        db.delete(verification)
        db.commit()

        raise HTTPException(
            status_code=502,
            detail="Could not send the verification SMS. Check the backend terminal.",
        ) from exc

    return {
        "status": "sent",
        "message": "Verification code sent by SMS.",
    }

@app.get("/", response_model=HealthResponse)
def health_check():
    """Confirm that the API is running."""
    return {
        "status": "ok",
        "app": "Sent SMS Demo",
    }

class VerificationCode(Base):
    __tablename__ = "verification_codes"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    phone_number: Mapped[str] = mapped_column(
        String(20),
        index=True,
    )

    code_hash: Mapped[str] = mapped_column(
        String(64),
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
    )

    attempts: Mapped[int] = mapped_column(
        Integer,
        default=0,
    )

    verified: Mapped[bool] = mapped_column(
        default=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


# Create tables only after all SQLAlchemy models have been declared.
Base.metadata.create_all(bind=engine)
