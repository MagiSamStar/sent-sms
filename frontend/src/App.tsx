import { useState } from 'react'
import type { FormEvent } from 'react'
import { requestVerificationCode, verifyCode } from './api'
import './App.css'

type FlowStep = 'phone' | 'code' | 'success'

function App() {
  const [step, setStep] = useState<FlowStep>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [code, setCode] = useState('')
  const [consent, setConsent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleRequestCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await requestVerificationCode(phoneNumber.trim(), consent)
      setStep('code')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await verifyCode(phoneNumber.trim(), code)
      setStep('success')
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetFlow = () => {
    setStep('phone')
    setCode('')
    setError('')
  }

  return (
    <main className="site-shell">
      <nav className="topbar" aria-label="Main navigation">
        <a className="brand" href="/" aria-label="Sent SMS Demo home"><span className="brand-mark" aria-hidden="true">✦</span><span>sent<span className="brand-dot">.</span>sms</span></a>
        <span className="nav-status"><span className="status-dot" /> API demo</span>
      </nav>

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Built with the Sent messaging API</p>
          <h1>Verify identity.<br /><em>Keep it simple.</em></h1>
          <p className="hero-description">A focused SMS verification flow designed to show how a messaging API can fit into a thoughtful product experience.</p>
          <div className="hero-meta"><span><strong>01</strong> Enter number</span><span><strong>02</strong> Verify code</span><span><strong>03</strong> You&apos;re in</span></div>
        </div>

        <div className="verification-card">
          <div className="card-topline"><span>LIVE PLAYGROUND</span><span className="window-dots" aria-hidden="true">•••</span></div>
          {step === 'phone' && (
            <form onSubmit={handleRequestCode} noValidate>
              <div className="card-heading"><span className="step-number">01</span><div><h2>Send a verification code</h2><p>We&apos;ll text a six-digit code to your phone.</p></div></div>
              <label htmlFor="phone-number">Phone number</label>
              <input id="phone-number" name="phone-number" type="tel" autoComplete="tel" placeholder="+1 555 123 4567" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} required minLength={8} maxLength={16} />
              <p className="field-hint">Use international format, including your country code.</p>
              <label className="consent-label" htmlFor="consent"><input id="consent" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required /><span>I agree to receive a one-time verification SMS.</span></label>
              {error && <p className="form-message error" role="alert">{error}</p>}
              <button className="primary-button" type="submit" disabled={isSubmitting || !consent}>{isSubmitting ? 'Sending code…' : 'Send verification code'} <span aria-hidden="true">→</span></button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleVerifyCode}>
              <div className="card-heading"><span className="step-number">02</span><div><h2>Check your messages</h2><p>Enter the code sent to <strong>{phoneNumber}</strong>.</p></div></div>
              <label htmlFor="verification-code">Six-digit code</label>
              <input className="code-input" id="verification-code" name="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required autoFocus />
              <p className="field-hint">The code expires after 10 minutes.</p>
              {error && <p className="form-message error" role="alert">{error}</p>}
              <button className="primary-button" type="submit" disabled={isSubmitting || code.length !== 6}>{isSubmitting ? 'Checking code…' : 'Verify phone number'} <span aria-hidden="true">→</span></button>
              <button className="text-button" type="button" onClick={resetFlow}>← Use a different number</button>
            </form>
          )}

          {step === 'success' && (
            <div className="success-state" role="status"><div className="success-icon" aria-hidden="true">✓</div><span className="step-number">03</span><h2>Phone verified.</h2><p>Your number has been verified successfully. That&apos;s the whole flow.</p><button className="text-button" type="button" onClick={resetFlow}>Run it again →</button></div>
          )}
        </div>
      </section>

      <section className="details-section" aria-label="Project details">
        <div className="detail-item"><span className="detail-label">01 / SAFETY FIRST</span><p>Codes are hashed at rest and real SMS is opt-in by environment variable.</p></div>
        <div className="detail-item"><span className="detail-label">02 / BUILT TO SHOW</span><p>FastAPI, SQLite, React, TypeScript, and the Sent SDK.</p></div>
        <div className="detail-item"><span className="detail-label">03 / MORE CONTEXT</span><p>Explore the <a href="https://ask-my-repo-sentdm.vercel.app" target="_blank" rel="noreferrer">AI repository assistant ↗</a>.</p></div>
      </section>

      <section className="related-build" aria-labelledby="related-build-title">
        <div className="related-build-copy">
          <span className="detail-label">RELATED BUILD / 01</span>
          <h2 id="related-build-title">Content-to-Campaign Pipeline</h2>
          <p>
            A content operations workspace that turns campaign briefs into
            platform-specific LinkedIn, X, and newsletter drafts, with
            revision, approval, and Sent sandbox notifications built into the
            workflow.
          </p>
          <a
            className="related-build-link"
            href="https://content-to-campain.vercel.app"
            target="_blank"
            rel="noreferrer"
          >
            Explore the project <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="related-build-media">
          <div className="video-label">
            <span className="status-dot" aria-hidden="true" />
            WORKFLOW DEMO / 01:26
          </div>
          <video
            className="related-build-video"
            controls
            preload="metadata"
            aria-label="Content-to-Campaign Pipeline demo"
          >
            <source src="/video/content-to-campaign-demo.mp4" type="video/mp4" />
            Your browser does not support embedded video.{' '}
            <a href="/video/content-to-campaign-demo.mp4">Open the demo video</a>.
          </video>
        </div>
      </section>
      <footer><span>Sent SMS Demo</span><span>Messaging, thoughtfully implemented.</span></footer>
    </main>
  )
}

export default App
