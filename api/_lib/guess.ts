const NOISE_WORDS = new Set(['the', 'a', 'an'])

type GuessableClip = { title: string; aliases: string[] }

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function canonical(text: string): string {
  const words = normalize(text).split(' ')
  while (words.length > 1 && NOISE_WORDS.has(words[0]!)) words.shift()
  return words.join(' ')
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)

  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost)
    }
    prev = curr
  }

  return prev[b.length]!
}

function closeEnough(guess: string, target: string): boolean {
  if (guess === target) return true
  if (target.length < 5) return false

  const tolerance = target.length <= 10 ? 1 : 2
  return levenshtein(guess, target) <= tolerance
}

export function checkGuess(guess: string, clip: GuessableClip): boolean {
  const g = canonical(guess)
  if (!g) return false

  return [clip.title, ...clip.aliases].some((title) => closeEnough(g, canonical(title)))
}
