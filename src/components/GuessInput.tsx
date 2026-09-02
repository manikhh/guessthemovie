import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { motion, useAnimation } from 'framer-motion'
import type { Difficulty } from '../types'
import { searchMovieTitles } from '../lib/search'
import { Expand, MorphIcon, Send } from './icons'

interface GuessInputProps {
  disabled: boolean
  guessesLeft: number
  difficulty: Difficulty
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
  difficulty,
  onSubmit,
  onMore,
  onGiveUp,
  canShowMore,
  moreLabel,
  focusToken,
  shakeToken,
}: GuessInputProps) {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()
  const controls = useAnimation()
  const hasInput = value.trim().length > 0
  const atMaxClip = !canShowMore

  const suggestions = useMemo(
    () => (hasInput && !disabled ? searchMovieTitles(value, difficulty) : []),
    [value, difficulty, hasInput, disabled],
  )

  useEffect(() => {
    setValue('')
    setOpen(false)
    setActiveIndex(0)
    inputRef.current?.focus()
  }, [focusToken])

  useEffect(() => {
    if (shakeToken === 0) return
    void controls.start({
      x: [0, -8, 8, -6, 6, -3, 3, 0],
      transition: { duration: 0.4, ease: 'easeOut' },
    })
  }, [shakeToken, controls])

  useEffect(() => {
    // Nearest ranked match is always first — select it as the user types.
    setActiveIndex(0)
    setOpen(suggestions.length > 0)
  }, [suggestions])

  useEffect(() => {
    if (!open || activeIndex < 0) return
    const item = listRef.current?.querySelector<HTMLElement>(`[data-suggest-index="${activeIndex}"]`)
    item?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open, suggestions])

  function submitGuess(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setValue('')
    setOpen(false)
    setActiveIndex(0)
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault()
    if (hasInput) {
      const pick =
        open && suggestions.length > 0
          ? suggestions[Math.max(0, Math.min(activeIndex, suggestions.length - 1))] ?? value
          : value
      submitGuess(pick)
      return
    }
    if (canShowMore && !disabled) onMore()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % suggestions.length)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      setActiveIndex(0)
    }
  }

  return (
    <div className="guess-root">
      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="guess-suggest"
          id={listId}
          role="listbox"
          aria-label="Movie suggestions"
        >
          {suggestions.map((title, i) => (
            <li key={title} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                id={`${listId}-opt-${i}`}
                data-suggest-index={i}
                className={`guess-suggest-item ${i === activeIndex ? 'is-active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => submitGuess(title)}
              >
                {title}
              </button>
            </li>
          ))}
        </ul>
      )}

      <motion.form className="guess-form" onSubmit={handleFormSubmit} animate={controls}>
        <div className="guess-field">
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
            aria-autocomplete="list"
            aria-controls={open ? listId : undefined}
            aria-activedescendant={
              open && suggestions[activeIndex] ? `${listId}-opt-${activeIndex}` : undefined
            }
            aria-expanded={open}
            role="combobox"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) {
                setOpen(true)
                setActiveIndex(0)
              }
            }}
            onBlur={() => {
              window.setTimeout(() => setOpen(false), 120)
            }}
          />
        </div>
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
    </div>
  )
}
