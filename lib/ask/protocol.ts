export const ASK_ENABLED = process.env.NEXT_PUBLIC_ASK_ENABLED === '1'

export const MAX_QUESTION_LENGTH = 500
export const MAX_CONVERSATION_CHARS = 120_000

export type AskMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AskEvent =
  | { type: 'text'; text: string }
  | { type: 'done' }
  | { type: 'refusal' }
  | { type: 'error'; code: 'busy' | 'failed' }

export type AskErrorCode = 'offline' | 'rate_limited' | 'invalid'
