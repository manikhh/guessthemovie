import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function AuthBar() {
  const { user, loading, logout } = useAuth()

  if (loading) {
    return <p className="auth-bar auth-bar-muted">Checking session…</p>
  }

  if (user) {
    return (
      <div className="auth-bar">
        <span className="auth-bar-user">
          @{user.username} · {user.points} pts
        </span>
        <Link to="/leaderboard" className="btn btn-outline auth-bar-action">
          Leaderboard
        </Link>
        <button type="button" className="btn btn-ghost auth-bar-action" onClick={() => void logout()}>
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="auth-bar">
      <Link to="/leaderboard" className="btn btn-outline auth-bar-action">
        Leaderboard
      </Link>
      <Link to="/login" className="btn btn-outline auth-bar-action">
        Sign in
      </Link>
      <Link to="/signup" className="btn btn-primary auth-bar-action">
        Sign up
      </Link>
    </div>
  )
}
