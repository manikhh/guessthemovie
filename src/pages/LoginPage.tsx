import { useCallback, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FactoryMark } from '../components/FactoryMark'
import { TurnstileWidget } from '../components/TurnstileWidget'
import { login } from '../lib/auth'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nextPath = searchParams.get('next')
  const { setUser } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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

    if (!turnstileToken) {
      setError('Complete the bot check first.')
      return
    }

    setSubmitting(true)
    try {
      const user = await login({
        username: username.trim().toLowerCase(),
        password,
        turnstileToken,
      })
      setUser(user)
      const next = nextPath ?? ''
      const safeNext =
        next.startsWith('/') && !next.startsWith('//') && !next.includes('://') && !next.includes('\\')
          ? next
          : '/'
      navigate(safeNext, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
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
            <h1 className="brand-name">Sign in</h1>
            <p className="masthead-sub">Welcome back to the factory.</p>
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          No account? <Link to="/signup">Create one</Link>
        </p>
        <p className="auth-switch">
          <Link to="/">← Back to game</Link>
        </p>
      </main>
    </div>
  )
}
