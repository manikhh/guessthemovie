import { FactoryMark } from '../components/FactoryMark'
import { AuthBar } from '../components/AuthBar'
import { ModeSelect } from '../components/ModeSelect'
import { SupportStrip } from '../components/SupportStrip'

export function HomePage() {
  return (
    <div className="app is-lobby">
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
        <AuthBar />
      </header>

      <main className="main">
        <ModeSelect />
      </main>

      <footer className="site-footer">
        <SupportStrip />
        <p className="watermark">by Chocolate Factory</p>
      </footer>
    </div>
  )
}
