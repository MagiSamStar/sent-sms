# Sent SMS Verification Demo

A production-shaped SMS verification flow built with the Sent messaging API. The project demonstrates how a messaging integration can be wrapped in a focused product experience with explicit consent, phone-number normalization, rate limiting, hashed verification codes, expiry handling, and clear failure states.

This is a portfolio project and a technical reference implementation. It is intentionally small enough to inspect end to end.

## Demo

- [Content-to-Campaign Pipeline](https://content-to-campain.vercel.app)
- [Content-to-Campaign demo video](video/content-to-campaign-demo.mp4)

The companion Content-to-Campaign project uses Sent sandbox notifications to connect content generation, revision, approval, and delivery workflows.

## What this demonstrates

- Integrating the Sent SDK into a FastAPI service.
- Designing a two-step verification flow around `/request-code` and `/verify-code`.
- Validating and normalizing international phone numbers to E.164 format.
- Storing only a SHA-256 hash of each verification code.
- Enforcing code expiry, attempt limits, request rate limits, and explicit SMS consent.
- Separating a React/TypeScript client from a Python API through an environment-configured base URL.
- Handling provider failures without leaving an unusable pending verification record.

## Architecture

```text
React + TypeScript + Vite
        |
        | JSON over HTTP
        v
FastAPI service
  |       |       |
  |       |       +--> Sent SDK --> SMS template
  |       +----------> SQLite / SQLAlchemy
  +------------------> validation + rate limiting
```

The frontend owns the interaction state: phone entry, code entry, and success. The backend owns validation, persistence, security-sensitive decisions, and provider communication. The Sent API key never reaches the browser.

## Verification flow

1. The user enters an international phone number and explicitly consents to receive a one-time SMS.
2. `POST /request-code` parses and validates the number, normalizes it to E.164, generates a six-digit code, and stores only its hash.
3. The backend sends the code through the configured Sent SMS template.
4. If delivery fails, the pending database record is deleted and the API returns a provider-related error.
5. The user submits the code through `POST /verify-code`.
6. The backend checks the newest unverified record, expiry, attempt count, and constant-time hash equality before marking it verified.

## API reference

### `GET /`

Health check.

```json
{
  "status": "ok",
  "app": "Sent SMS Demo"
}
```

### `POST /validate-phone`

Validates an international number without creating a verification request.

```json
{
  "phone_number": "+14155552671"
}
```

Successful response:

```json
{
  "valid": true,
  "phone_number": "+14155552671"
}
```

### `POST /request-code`

Creates a verification record and sends the SMS. Consent is required.

```json
{
  "phone_number": "+14155552671",
  "consent": true
}
```

Successful response:

```json
{
  "status": "sent",
  "message": "Verification code sent by SMS."
}
```

Rate limit: 5 requests per minute per remote address.

### `POST /verify-code`

Checks a six-digit code for the normalized phone number.

```json
{
  "phone_number": "+14155552671",
  "code": "123456"
}
```

Successful response:

```json
{
  "status": "verified",
  "message": "Phone number verified."
}
```

Codes expire after 10 minutes. A pending code allows five failed attempts. The endpoint is limited to 10 requests per minute per remote address.

## Security and reliability decisions

### Consent is explicit

The client requires the user to check a consent box before requesting an SMS, and the backend enforces the same rule. This prevents a client-side-only consent control from being bypassed.

### Codes are not stored in plaintext

The generated code is hashed with SHA-256 before persistence. Verification uses `secrets.compare_digest` so the stored database value is not enough to recover the original code.

### Provider failure is transactional from the user’s perspective

The verification record is created before the provider call so the code can be associated with the request. If Sent delivery fails, the record is removed before the error is returned. This prevents users from being left with a code that was never delivered.

### Abuse controls are layered

The service combines request rate limits, a ten-minute expiry window, and a five-attempt limit per verification record. These controls are intentionally simple and visible for demonstration purposes.

## Local development

### Backend

```powershell
cd backend
py -m pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn main:app --reload --port 8000
```

Set the following values in `backend/.env` when testing Sent delivery:

```env
SENT_DM_API_KEY=your-sent-api-key
SENT_ALLOW_REAL_SMS=false
```

Keep `SENT_ALLOW_REAL_SMS=false` while inspecting the application locally. With delivery disabled, the API intentionally returns an error when the request reaches the provider step rather than sending an SMS.

### Frontend

In a second terminal:

```powershell
cd frontend
npm install
$env:VITE_API_BASE_URL='http://127.0.0.1:8000'
npm run dev
```

Open the Vite URL shown in the terminal. The frontend is configured to call the backend through `VITE_API_BASE_URL`; it does not contain provider credentials.

## Deployment model

The simplest deployment for this repository is to host the frontend on Vercel and the FastAPI service on Render.

### Vercel

- Project root: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL=https://your-backend.onrender.com`

The demo video is served from `frontend/public/video/` and is included as a static asset in the frontend build.

### Render

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Environment variables: `SENT_DM_API_KEY` and `SENT_ALLOW_REAL_SMS`

Before deploying, update the backend CORS allowlist with the exact Vercel frontend origin. Origins must include the scheme, for example `https://example.vercel.app`.

## Testing and quality checks

From `frontend/`:

```powershell
npm run build
npm run lint
```

The build validates TypeScript and produces the deployable Vite bundle. The lint check covers the React and TypeScript source.

For a production service, the next testing layer would include API tests for invalid numbers, missing consent, expired codes, failed attempts, duplicate requests, provider failures, and rate-limit responses.

## Deliberate demo limitations

- SQLite is used for inspectability. A production deployment should use a managed database such as PostgreSQL.
- The SQLite file is local to the backend service and is not a durable multi-instance data store.
- Rate limiting is process-oriented and should use shared storage when the API is scaled horizontally.
- The SMS template identifier is configured in the backend integration code for this demo.
- Real SMS delivery is opt-in through an environment variable and should only be enabled with an intentional test number.

## Repository layout

```text
backend/
  main.py              FastAPI app, routes, validation, persistence, Sent integration
  requirements.txt     Python dependencies
  .env.example         Safe environment variable template

frontend/
  src/App.tsx          Verification UI and related project showcase
  src/api.ts           Typed frontend-to-backend requests
  public/video/        Portfolio demo video
  package.json         Frontend scripts and dependencies

video/
  content-to-campaign-demo.mp4   Original demo video source
```

## License and credentials

This project is intended as a portfolio demonstration. Do not commit API keys, production recipient data, or local environment files. Never enable real SMS delivery without confirming the recipient, consent, provider configuration, and expected cost.
