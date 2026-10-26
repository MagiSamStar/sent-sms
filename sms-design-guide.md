Continue building my `sent-sms-demo` portfolio project. The FastAPI backend is in `backend/`, and the React + TypeScript + Vite frontend is in `frontend/`.

**Goal:** Build a polished, recruiter-friendly demo of the Sent messaging API with a real SMS verification flow.

### Existing backend

- `POST /request-code` accepts `phone_number` and `consent`.
- `POST /verify-code` accepts `phone_number` and a six-digit `code`.
- `GET /` is the health endpoint.
- SQLite stores verification records and code hashes.
- Phone validation uses `phonenumbers`.
- Sent SDK import is `from sent_dm import Sent`.
- The verification template ID is configured in the existing `send_verification_sms()` helper.
- `SENT_ALLOW_REAL_SMS=false` should remain the default safety setting.
- `.env` contains secrets and must never be committed.

### Frontend tasks

1. Inspect the existing code before making changes.
2. Build a responsive React + TypeScript landing page with a polished, modern developer-portfolio aesthetic: dark background, restrained purple accents, clean typography, and subtle effects.
3. Create a phone-number form with clear international-format guidance and an explicit SMS consent checkbox.
4. Add a six-digit verification screen after a successful request.
5. Connect the frontend to the existing FastAPI endpoints. Use a Vite environment variable such as `VITE_API_BASE_URL` rather than hardcoding the production URL.
6. Add loading states, accessible labels, helpful errors, success feedback, and a way to return to the phone-entry screen.
7. Add or configure FastAPI CORS for local development, allowing only the necessary frontend origin.
8. Include a small section linking to my existing AI repository assistant project: https://ask-my-repo-sentdm.vercel.app
9. Add concise setup instructions to the README for running the frontend and backend locally.

### Important constraints

- Keep this an MVP. Do not add authentication, Redis, background workers, payment features, or unnecessary infrastructure.
- Do not expose API keys or verification codes in frontend responses, logs, or source control.
- Do not enable real SMS sending automatically. Keep the environment-controlled safety switch.
- Do not make real SMS requests while developing or testing the UI.
- Review the existing verification and error-handling behavior. Flag any security or reliability issues you find, but avoid an unnecessary rewrite.
- Do not claim a feature works unless you have tested it.
- At the end, summarize the files changed, commands to run, and any remaining manual steps.

Work directly in the existing project, preserve the working backend integration, and explain any changes that affect the API contract.
