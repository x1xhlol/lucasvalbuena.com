export const CARD_NAMES = ['project', 'projects', 'experience', 'posts', 'contact', 'pricing', 'photos'] as const
export type CardName = (typeof CARD_NAMES)[number]

export type AnswerPart =
  | { type: 'text'; text: string }
  | { type: 'card'; name: CardName; slug?: string }

const MAX_CARDS = 2

const CARD_TAG = new RegExp(String.raw`<(${CARD_NAMES.join('|')})\b([^<>]*?)\/?>(?:[^<]*<\/\1\s*>)?`, 'gi')
const STRAY_CLOSING_TAG = new RegExp(String.raw`<\/(?:${CARD_NAMES.join('|')})\s*>`, 'gi')
const TRAILING_TAG = /<\/?([a-z]*)([^<>]*)$/i

function isCardName(name: string): name is CardName {
  return (CARD_NAMES as readonly string[]).includes(name)
}

function hidePartialTag(text: string): string {
  const partial = text.match(TRAILING_TAG)
  if (!partial || partial.index === undefined) return text
  const name = partial[1].toLowerCase()
  const rest = partial[2]
  const isCard = rest
    ?
      isCardName(name) && /^[\s/]/.test(rest)
    :
      CARD_NAMES.some((card) => card.startsWith(name))
  return isCard ? text.slice(0, partial.index) : text
}

export function splitAnswer(answer: string): AnswerPart[] {
  const parts: AnswerPart[] = []
  const shown = new Set<string>()
  let cursor = 0
  const pushText = (text: string) => {
    const clean = text.replace(STRAY_CLOSING_TAG, '')
    if (clean.trim()) parts.push({ type: 'text', text: clean.trim() })
  }

  for (const match of answer.matchAll(CARD_TAG)) {
    pushText(answer.slice(cursor, match.index))
    cursor = match.index + match[0].length
    const name = match[1].toLowerCase()
    if (!isCardName(name)) continue
    const slug = match[2].match(/\bslug\s*=\s*["']([^"']*)["']/i)?.[1]?.trim().toLowerCase()
    const key = `${name}:${slug ?? ''}`
    if (shown.has(key) || shown.size >= MAX_CARDS) continue
    shown.add(key)
    parts.push({ type: 'card', name, slug })
  }
  pushText(hidePartialTag(answer.slice(cursor)))
  return parts
}

export function answerToSpeech(answer: string): string {
  return splitAnswer(answer)
    .flatMap((part) => (part.type === 'text' ? [part.text] : []))
    .join(' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
}

export type AskCardData = {
  stats: Record<string, { stars: string; forks: string }>
  posts: { title: string; slug: string; publishedAt: string }[]
  photos: { total: number; latest: { url: string; width: number; height: number }[] }
}

const FOLLOW_UPS: Record<string, string[]> = {
  'project:zeroleaks': ['How much does ZeroLeaks cost?', 'Is ZeroLeaks open source?'],
  'project:system-prompts': ['Is the prompts repo stolen?', 'How did he get into AI security?'],
  'project:pare': ['How does Pare keep the quality?', "What's the best thing he's built?"],
  'project:zero-calendar': ['What else has he built?', "What's the best thing he's built?"],
  'project:better-clawd': ['What else has he built?', "What's the best thing he's built?"],
  projects: ["What's the best thing he's built?", 'Where does he work?'],
  experience: ['What did he do at Orchid?', 'What is ZeroLeaks?'],
  posts: ['How did he get into AI security?', 'What did Orchid teach him?'],
  contact: ['What is he looking for right now?', 'Where does he work?'],
  pricing: ['Is there a free plan?', 'What does Shield do?'],
  photos: ['What has he built?', 'Where does he work?'],
}

const normalize = (question: string) => question.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function followUpsFor(answer: string, asked: string[]): string[] {
  const card = splitAnswer(answer).find((part) => part.type === 'card')
  if (!card || card.type !== 'card') return []
  const options = FOLLOW_UPS[card.slug ? `${card.name}:${card.slug}` : card.name] ?? FOLLOW_UPS[card.name] ?? []
  const seen = new Set(asked.map(normalize))
  return options.filter((question) => !seen.has(normalize(question))).slice(0, 2)
}
