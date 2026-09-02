import type { Difficulty, MovieClip } from '../types'
import { getClipsForDifficulty, getRankedClips } from './difficulty'

export type DeckPool = Difficulty | 'ranked'

/** A reshuffling queue so a session never repeats a film until the pool is exhausted. */
export class Deck {
  private queue: MovieClip[] = []

  constructor(private readonly pool: DeckPool) {
    this.refill()
  }

  private poolClips(): MovieClip[] {
    return this.pool === 'ranked' ? getRankedClips() : getClipsForDifficulty(this.pool)
  }

  private refill(lastId?: string) {
    const shuffled = shuffle(this.poolClips())

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
