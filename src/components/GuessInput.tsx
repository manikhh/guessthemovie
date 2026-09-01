import { useEffect, useRef, useState } from 'react'

interface GuessInputProps {
  disabled: boolean
  guessesLeft: number
  onSubmit: (guess: string) => void
  /** Bump to refocus the field, e.g. when a new round starts. */
  focusToken: number
}

export function GuessInput({ disabled, guessesLeft, onSubmit, focusToken }: GuessInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValue('')
    inputRef.current?.focus()
  }, [focusToken])

  function submit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setValue('')
  }

  return (
    <form
      className="guess-form"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
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
      <button type="submit" className="btn btn-primary" disabled={disabled || !value.trim()}>
        Guess
      </button>
      <span className="guess-left" aria-live="polite">
        {guessesLeft} left
      </span>
    </form>
  )
}
