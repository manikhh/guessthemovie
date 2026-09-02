import { useState } from 'react'
import type { Difficulty } from './types'
import { FactoryMark } from './components/FactoryMark'
import { ModeSelect } from './components/ModeSelect'
import { GameBoard } from './components/GameBoard'
import { RankHub } from './components/RankHub'

type Screen =
  | { view: 'menu' }
  | { view: 'game'; difficulty: Difficulty; ranked?: false }
  | { view: 'game'; ranked: true }
  | { view: 'ranks' }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ view: 'menu' })
  const compact = screen.view !== 'menu'

  return (
    <div className="app">
      <header className={`masthead ${compact ? 'is-compact' : ''}`}>
        <div className="brand">
          <FactoryMark className="brand-mark" />
          <div className="brand-lockup">
            <h1 className="brand-name">Chocolate</h1>
            <p className="brand-factory">Factory</p>
            <p className="brand-studios">Game Studios</p>
          </div>
        </div>
        {screen.view === 'menu' && (
          <p className="masthead-sub">One frame. One guess. How fast can you name it?</p>
        )}
      </header>

      <main className="main">
        {screen.view === 'menu' ? (
          <ModeSelect
            onSelect={(difficulty) => setScreen({ view: 'game', difficulty })}
            onPlayRanked={() => setScreen({ view: 'game', ranked: true })}
            onOpenRanks={() => setScreen({ view: 'ranks' })}
          />
        ) : screen.view === 'ranks' ? (
          <RankHub onBack={() => setScreen({ view: 'menu' })} />
        ) : screen.ranked ? (
          <GameBoard key="ranked" ranked onExit={() => setScreen({ view: 'menu' })} />
        ) : (
          <GameBoard
            key={screen.difficulty}
            difficulty={screen.difficulty}
            onExit={() => setScreen({ view: 'menu' })}
          />
        )}
      </main>

      <footer className="site-footer">
        <p className="watermark">by Chocolate Factory</p>
      </footer>
    </div>
  )
}
