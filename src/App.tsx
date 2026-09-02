import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { HomePage } from './pages/HomePage'
import { GamePage } from './pages/GamePage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { loadYouTubeApi } from './lib/youtube'

const pageMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
}

export default function App() {
  const location = useLocation()

  useEffect(() => {
    loadYouTubeApi().catch(() => {})
  }, [])

  return (
    <AuthProvider>
      <AnimatePresence mode="wait">
        <motion.div key={location.pathname} style={{ minHeight: '100dvh' }} {...pageMotion}>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/play/:difficulty" element={<GamePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </AuthProvider>
  )
}
