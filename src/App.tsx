import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Difficulty } from './types'
import { FactoryMark } from './components/FactoryMark'
import { ModeSelect } from './components/ModeSelect'
import { GameBoard } from './components/GameBoard'
import { loadYouTubeApi } from './lib/youtube'

type Screen = { view: 'menu' } | { view: 'game'; difficulty: Difficulty }

const pageMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ view: 'menu' })
  const inTheater = screen.view === 'game'

  useEffect(() => {
    loadYouTubeApi().catch(() => {})
  }, [])

  return (
    <div className={`app ${inTheater ? 'is-theater' : 'is-lobby'}`}>
      {!inTheater && (
        <header className="masthead">
          <div className="brand">
            <FactoryMark className="brand-mark" />
            <div className="brand-lockup">
              <h1 className="brand-name">Chocolate</h1>
              <p className="brand-factory">Factory</p>
              <p className="brand-studios">Game Studios</p>
            </div>
          </div>
          <p className="masthead-sub">One frame. One guess. Name the film.</p>
        </header>
      )}

      <main className="main">
        <AnimatePresence mode="wait">
          {screen.view === 'menu' ? (
            <motion.div key="menu" {...pageMotion}>
              <ModeSelect onSelect={(difficulty) => setScreen({ view: 'game', difficulty })} />
            </motion.div>
          ) : (
            <motion.div key="game" style={{ height: '100%' }} {...pageMotion}>
              <GameBoard
                key={screen.difficulty}
                difficulty={screen.difficulty}
                onExit={() => setScreen({ view: 'menu' })}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {!inTheater && (
        <footer className="site-footer">
          <p className="watermark">by Chocolate Factory</p>
        </footer>
      )}
    </div>
  )
}
