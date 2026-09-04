import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const CARD_NUMBER = '6219 8618 4289 9543'
const WALLET_ADDRESS = '0x53d256b53b714fAdbbE8a0eC1918F1f24978120C'
const TELEGRAM_HANDLE = 'ChocolateFactoryGames'
const TELEGRAM_URL = `https://t.me/${TELEGRAM_HANDLE}`

function CopyValue({ label, value, note }: { label: string; value: string; note?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value.replace(/\s+/g, ''))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="support-row">
      <div className="support-row-copy">
        <span className="support-row-label">{label}</span>
        <code className="support-row-value">{value}</code>
        {note ? <span className="support-row-note">{note}</span> : null}
      </div>
      <button type="button" className="btn-quiet support-copy" onClick={() => void copy()}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

export function SupportStrip() {
  const [open, setOpen] = useState(false)

  return (
    <div className="support">
      <button
        type="button"
        className={`support-trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Keep us alive
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            className="support-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="support-pitch">
              Help us build more. Small donations keep the factory running.
            </p>
            <CopyValue label="Card" value={CARD_NUMBER} />
            <CopyValue label="USDT" value={WALLET_ADDRESS} note="Tether · BEP20" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <a
        className="support-contact"
        href={TELEGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Contact us · @{TELEGRAM_HANDLE}
      </a>
    </div>
  )
}
