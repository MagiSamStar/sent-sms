const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

async function readResponse(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({})) as { detail?: string; message?: string }
  if (!response.ok) throw new Error(data.detail ?? data.message ?? fallback)
  return data
}

export async function requestVerificationCode(phoneNumber: string, consent: boolean) {
  try {
    const response = await fetch(`${API_BASE_URL}/request-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone_number: phoneNumber, consent }) })
    return await readResponse(response, 'Could not request a verification code.')
  } catch (error) {
    if (error instanceof Error && error.message !== 'Failed to fetch') throw new Error(error.message, { cause: error })
    throw new Error('The API is unavailable. Make sure the backend is running and try again.', { cause: error })
  }
}

export async function verifyCode(phoneNumber: string, code: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/verify-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone_number: phoneNumber, code }) })
    return await readResponse(response, 'Could not verify the code.')
  } catch (error) {
    if (error instanceof Error && error.message !== 'Failed to fetch') throw new Error(error.message, { cause: error })
    throw new Error('The API is unavailable. Make sure the backend is running and try again.', { cause: error })
  }
}
