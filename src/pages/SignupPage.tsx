import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FactoryMark } from '../components/FactoryMark'
import { TurnstileWidget } from '../components/TurnstileWidget'
import { signup } from '../lib/auth'
import { useAuth } from '../hooks/useAuth'

export function SignupPage() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [turnstileKey, setTurnstileKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleToken = useCallback((token: string | null) => {
    setTurnstileToken(token)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== repeatPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!turnstileToken) {
      setError('Complete the bot check first.')
      return
    }

    setSubmitting(true)
    try {
      const user = await signup({
        username: username.trim().toLowerCase(),
        password,
        repeatPassword,
        turnstileToken,
      })
      setUser(user)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
      setTurnstileToken(null)
      setTurnstileKey((k) => k + 1)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app is-lobby auth-page">
      <header className="masthead">
        <div className="brand">
          <FactoryMark className="brand-mark" />
          <div className="brand-lockup">
            <h1 className="brand-name">Sign up</h1>
            <p className="masthead-sub">Create your factory pass.</p>
          </div>
        </div>
      </header>

      <main className="main">
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span className="auth-label">Username</span>
            <input
              className="auth-input"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={32}
              pattern="[a-zA-Z0-9_]+"
            />
          </label>

          <label className="auth-field">
            <span className="auth-label">Password</span>
            <input
              className="auth-input"
              type="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>

          <label className="auth-field">
            <span className="auth-label">Repeat password</span>
            <input
              className="auth-input"
              type="password"
              name="repeatPassword"
              autoComplete="new-password"
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>

          <TurnstileWidget key={turnstileKey} onToken={handleToken} />

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary btn-lg auth-submit"
            disabled={submitting || !turnstileToken}
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
        <p className="auth-switch">
          <Link to="/">← Back to game</Link>
        </p>
      </main>
    </div>
  )
}
