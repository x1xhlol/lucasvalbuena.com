// Subsequence fuzzy matcher for the command palette. Scores favor matches at
// word starts and consecutive runs, so "bp" ranks "Blog Posts" above "About".

export interface FuzzyResult {
  score: number
  // Indices into the target string, for highlighting matched characters
  indices: number[]
}

const WORD_START_BONUS = 8
const CONSECUTIVE_BONUS = 5
const FIRST_CHAR_BONUS = 10
const GAP_PENALTY = 1

function isWordStart(target: string, i: number): boolean {
  if (i === 0) return true
  const prev = target[i - 1]
  return prev === ' ' || prev === '-' || prev === '_' || prev === '/'
}

export function fuzzyMatch(query: string, target: string): FuzzyResult | null {
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  if (q.length === 0) return { score: 0, indices: [] }
  if (q.length > t.length) return null

  const indices: number[] = []
  let score = 0
  let ti = 0

  for (let qi = 0; qi < q.length; qi++) {
    const found = t.indexOf(q[qi], ti)
    if (found === -1) return null

    if (found === 0) score += FIRST_CHAR_BONUS
    if (isWordStart(target, found)) score += WORD_START_BONUS
    if (indices.length > 0 && found === indices[indices.length - 1] + 1) {
      score += CONSECUTIVE_BONUS
    }
    score -= (found - ti) * GAP_PENALTY

    indices.push(found)
    ti = found + 1
  }

  return { score, indices }
}
