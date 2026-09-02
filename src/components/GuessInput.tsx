import { useEffect, useRef, useState, type FormEvent } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { Expand, MorphIcon, Send } from './icons'

interface GuessInputProps {
  disabled: boolean
  guessesLeft: number
  onSubmit: (guess: string) => void
  onMore: () => void
  onGiveUp: () => void
  canShowMore: boolean
  moreLabel: string
  /** Bump to refocus the field, e.g. when a new round starts. */
  focusToken: number
  /** Bump to shake the field after a wrong guess. */
  shakeToken: number
}

export function GuessInput({
  disabled,
  guessesLeft,
  onSubmit,
  onMore,
  onGiveUp,
  canShowMore,
  moreLabel,
  focusToken,
  shakeToken,
}: GuessInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const controls = useAnimation()
  const hasInput = value.trim().length > 0
  const atMaxClip = !canShowMore

  useEffect(() => {
    setValue('')
    inputRef.current?.focus()
  }, [focusToken])

  useEffect(() => {
    if (shakeToken === 0) return
    void controls.start({
      x: [0, -8, 8, -6, 6, -3, 3, 0],
      transition: { duration: 0.4, ease: 'easeOut' },
    })
  }, [shakeToken, controls])

  function submitGuess() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setValue('')
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault()
    if (hasInput) {
      submitGuess()
      return
    }
    if (canShowMore && !disabled) onMore()
  }

  return (
    <motion.form className="guess-form" onSubmit={handleFormSubmit} animate={controls}>
      <input
        ref={inputRef}
        type="text"
        className="guess-input"
        placeholder="Name the movie…"
        value={value}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Your guess"
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="submit"
        className={`btn btn-primary guess-action ${hasInput ? 'is-guess' : 'is-more'}`}
        disabled={disabled || (hasInput ? false : !canShowMore)}
      >
        <MorphIcon
          icon={hasInput ? Send : Expand}
          size={14}
          strokeWidth={1.5}
          absoluteStrokeWidth
          spring="smooth"
          reducedMotion="user"
        />
        {hasInput ? 'Guess' : moreLabel}
      </button>
      <div className="guess-meta">
        <span className="guess-left" aria-live="polite">
          {guessesLeft} left
        </span>
        {atMaxClip && !disabled && (
          <button type="button" className="btn-give-up" onClick={onGiveUp}>
            Give up
          </button>
        )}
      </div>
    </motion.form>
  )
}
