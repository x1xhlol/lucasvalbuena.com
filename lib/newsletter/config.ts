// "New posts by email". Set at build time in next.config.mjs, like Ask's
// switch, so the form, the palette action, and the privacy note only appear
// on a deployment that can actually send.
export const NEWSLETTER_ENABLED = process.env.NEXT_PUBLIC_NEWSLETTER_ENABLED === '1'

export const NEWSLETTER_FROM_DEFAULT = 'Lucas Valbuena <hi@lucasvalbuena.com>'

// How long a confirmation link stays valid
export const CONFIRM_TTL_MS = 48 * 60 * 60 * 1000

// A teaser goes out this long after a post is first published, which leaves
// time to cancel it in Resend → Broadcasts
export const SEND_DELAY = 'in 10 min'

export const MAX_EMAIL_LENGTH = 254

// What /api/newsletter answers with when it can't start a signup
export type NewsletterErrorCode = 'invalid_email' | 'unavailable' | 'failed'

// Server only. Missing values make every entry point say it's unavailable
// rather than half-working.
export function newsletterEnv() {
  const apiKey = process.env.RESEND_API_KEY
  const segmentId = process.env.RESEND_NEWSLETTER_SEGMENT_ID
  const secret = process.env.NEWSLETTER_SECRET
  if (!apiKey || !segmentId || !secret) return null
  return {
    apiKey,
    segmentId,
    secret,
    from: process.env.NEWSLETTER_FROM || NEWSLETTER_FROM_DEFAULT,
    replyTo: process.env.NEWSLETTER_REPLY_TO || undefined,
    testTo: process.env.NEWSLETTER_TEST_TO || undefined,
  }
}

export type NewsletterEnv = NonNullable<ReturnType<typeof newsletterEnv>>

// Deliberately loose: the confirmation email is the real check. This only
// turns away things that can't be an address.
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null
}
