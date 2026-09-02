import { useEffect, useState } from 'react'
import type { Difficulty } from './types'
import { ModeSelect } from './components/ModeSelect'
import { GameBoard } from './components/GameBoard'
import { loadYouTubeApi } from './lib/youtube'

type Screen = { view: 'menu' } | { view: 'game'; difficulty: Difficulty }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ view: 'menu' })

  useEffect(() => {
    loadYouTubeApi().catch(() => {})
  }, [])

  return (
    <div className="app">
      <header className="masthead">
        <h1 className="wordmark">
          Guess<span>The</span>Movie
        </h1>
        {screen.view === 'menu' && (
          <p className="masthead-sub">One frame. One guess. How fast can you name it?</p>
        )}
      </header>

      <main className="main">
        {screen.view === 'menu' ? (
          <ModeSelect onSelect={(difficulty) => setScreen({ view: 'game', difficulty })} />
        ) : (
          <GameBoard
            key={screen.difficulty}
            difficulty={screen.difficulty}
            onExit={() => setScreen({ view: 'menu' })}
          />
        )}
      </main>
    </div>
  )
}
