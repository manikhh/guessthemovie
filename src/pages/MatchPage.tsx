import { FactoryMark } from '../components/FactoryMark'
import { SupportStrip } from '../components/SupportStrip'
import { MovieMatch } from '../components/match/MovieMatch'

export function MatchPage() {
  return (
    <div className="app">
      <header className="masthead is-compact">
        <div className="brand">
          <FactoryMark className="brand-mark" />
          <div className="brand-lockup">
            <h1 className="brand-name">Chocolate</h1>
            <p className="brand-factory">Factory</p>
            <p className="brand-studios">Game Studios</p>
          </div>
        </div>
      </header>

      <main className="main">
        <MovieMatch />
      </main>

      <footer className="site-footer">
        <SupportStrip />
        <p className="watermark">by Chocolate Factory</p>
      </footer>
    </div>
  )
}
