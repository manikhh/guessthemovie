import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Expand, MorphIcon, Send } from './icons'

interface GuessInputProps {
  disabled: boolean
  guessesLeft: number
  onSubmit: (guess: string) => void
  onMore: () => void
  canShowMore: boolean
  moreLabel: string
  /** Bump to refocus the field, e.g. when a new round starts. */
  focusToken: number
}

export function GuessInput({
  disabled,
  guessesLeft,
  onSubmit,
  onMore,
  canShowMore,
  moreLabel,
  focusToken,
}: GuessInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const hasInput = value.trim().length > 0

  useEffect(() => {
    setValue('')
    inputRef.current?.focus()
  }, [focusToken])

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
    <form className="guess-form" onSubmit={handleFormSubmit}>
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
      <span className="guess-left" aria-live="polite">
        {guessesLeft} left
      </span>
    </form>
  )
}
