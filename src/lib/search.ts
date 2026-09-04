import type { Difficulty } from '../types'
import { getTitlesForDifficulty } from './difficulty'

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Ranked title suggestions for the guess field (pool titles only). */
export function searchMovieTitles(
  query: string,
  difficulty: Difficulty,
  limit = 8,
): string[] {
  const q = normalize(query)
  if (q.length < 1) return []

  const titles = new Map<string, string>()
  for (const title of getTitlesForDifficulty(difficulty)) {
    const key = normalize(title)
    if (!titles.has(key)) titles.set(key, title)
  }

  const scored: { title: string; score: number }[] = []
  for (const [key, title] of titles) {
    if (!key.includes(q)) continue
    let score = 0
    if (key === q) score = 300
    else if (key.startsWith(q)) score = 200
    else if (key.split(' ').some((w) => w.startsWith(q))) score = 120
    else score = 40
    score -= Math.abs(key.length - q.length) * 0.1
    scored.push({ title, score })
  }

  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
  return scored.slice(0, limit).map((s) => s.title)
}
