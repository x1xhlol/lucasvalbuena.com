// Wire format between the Ask page and /api/ask. The response body is
// newline-delimited JSON, one AskEvent per line.

// Inlined at build time from next.config.mjs
export const ASK_ENABLED = process.env.NEXT_PUBLIC_ASK_ENABLED === '1'

export const MAX_QUESTION_LENGTH = 500
// The whole conversation goes with every question so the lock remembers all
// of it. This only guards against stuffing: a real chat reaches it after a
// couple of hundred exchanges, and the client then drops the oldest ones.
export const MAX_CONVERSATION_CHARS = 120_000

export type AskMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AskEvent =
  | { type: 'text'; text: string }
  | { type: 'done' }
  // The model declined; the client discards any partial answer
  | { type: 'refusal' }
  | { type: 'error'; code: 'busy' | 'failed' }

// Error responses sent before streaming starts carry one of these codes
export type AskErrorCode = 'offline' | 'rate_limited' | 'invalid'
