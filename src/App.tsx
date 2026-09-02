import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { GamePage } from './pages/GamePage'
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
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} style={{ minHeight: '100dvh' }} {...pageMotion}>
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/play/:difficulty" element={<GamePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}
