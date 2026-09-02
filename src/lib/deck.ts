import type { Difficulty, MovieClip } from '../types'
import { getClipsForDifficulty } from './difficulty'

/** A reshuffling queue so a session never repeats a film until the pool is exhausted. */
export class Deck {
  private queue: MovieClip[] = []

  constructor(private readonly difficulty: Difficulty) {
    this.refill()
  }

  private refill(lastId?: string) {
    const shuffled = shuffle(getClipsForDifficulty(this.difficulty))

    // Avoid showing the same film twice across a reshuffle boundary.
    if (lastId && shuffled.length > 1 && shuffled[0]?.id === lastId) {
      const [first, second, ...rest] = shuffled
      this.queue = [second!, first!, ...rest]
      return
    }

    this.queue = shuffled
  }

  next(): MovieClip | null {
    if (this.queue.length === 0) return null
    const movie = this.queue.shift()!
    if (this.queue.length === 0) this.refill(movie.id)
    return movie
  }

  /** Next film in the queue without removing it — used to prefetch video. */
  peek(): MovieClip | null {
    return this.queue[0] ?? null
  }

  get remaining(): number {
    return this.queue.length
  }
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}
