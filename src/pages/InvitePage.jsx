import { useState, useEffect } from 'react';
import { validateInviteToken, claimInviteToken } from '../api/index';

export default function InvitePage({ token }) {
  const [status, setStatus] = useState('loading'); // loading | valid | invalid | done
  const [errorMsg, setErrorMsg] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);

  useEffect(() => {
    validateInviteToken(token)
      .then((data) => { setExpiresAt(data.expiresAt); setStatus('valid'); })
      .catch((err) => { setErrorMsg(err.message); setStatus('invalid'); });
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await claimInviteToken(token, email.trim());
      setStatus('done');
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '32px 24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>💪</div>
        <div style={{
          fontSize: 22, fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '0.02em', color: 'var(--accent)', marginBottom: 6,
          fontFamily: 'var(--font-display)',
        }}>
          You're Invited
        </div>

        {status === 'loading' && (
          <div style={{ marginTop: 24 }}><div className="spinner" /></div>
        )}

        {status === 'invalid' && (
          <div style={{ marginTop: 16 }}>
            <div style={{ color: 'var(--red)', fontSize: 14, fontWeight: 600 }}>{errorMsg}</div>
            <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 8 }}>
              Ask for a new invite link.
            </div>
          </div>
        )}

        {status === 'valid' && (
          <>
            <div style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
              Enter your email to get access. You'll be able to sign in with Google once confirmed.
              {expiresAt && (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                  Expires {new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                className="input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                style={{ textAlign: 'center' }}
              />
              {submitError && (
                <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>{submitError}</div>
              )}
              <button
                type="submit"
                className="btn btn-accent"
                disabled={submitting || !email.trim()}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {submitting ? 'Confirming…' : 'Get Access'}
              </button>
            </form>
          </>
        )}

        {status === 'done' && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <div style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
              Access granted!
            </div>
            <div style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.5 }}>
              Sign in with your Google account using <strong>{email}</strong> to get started.
            </div>
            <button
              className="btn btn-accent"
              style={{ marginTop: 20, width: '100%', justifyContent: 'center' }}
              onClick={() => window.location.href = '/'}
            >
              Go to App
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
