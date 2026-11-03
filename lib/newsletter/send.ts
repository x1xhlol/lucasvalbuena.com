import { createHash } from 'node:crypto'
import { Resend } from 'resend'
import { siteConfig } from '@/lib/site'
import { SEND_DELAY, type NewsletterEnv } from '@/lib/newsletter/config'
import { createConfirmToken } from '@/lib/newsletter/token'
import { renderConfirmEmail, renderPostEmail, type PostEmailInput } from '@/lib/newsletter/emails'

// Everything that talks to Resend. Each function returns a plain result
// instead of throwing, so callers decide what a failure means for the visitor.

type Result<T = undefined> = { ok: true; value: T } | { ok: false; error: string }

const client = (env: NewsletterEnv) => new Resend(env.apiKey)

export async function sendConfirmation(env: NewsletterEnv, email: string): Promise<Result> {
  const token = createConfirmToken(email, env.secret)
  const confirmUrl = `${siteConfig.url.replace(/\/$/, '')}/newsletter/confirm?t=${encodeURIComponent(token)}`
  const { subject, html, text } = renderConfirmEmail(confirmUrl)
  // One confirmation per address per hour, however often the form is sent:
  // Resend drops a repeat of the same key within 24 hours
  const hour = Math.floor(Date.now() / 3_600_000)
  const addressKey = createHash('sha256').update(email).digest('hex').slice(0, 32)
  const { error } = await client(env).emails.send(
    { from: env.from, to: email, replyTo: env.replyTo, subject, html, text },
    { idempotencyKey: `newsletter-confirm/${addressKey}/${hour}` },
  )
  // A repeat within the hour comes back as a 409; to the visitor that's the
  // same as success, since the first email is already on its way
  if (error && error.name !== 'invalid_idempotent_request' && error.name !== 'concurrent_idempotent_requests') {
    return { ok: false, error: `${error.name}: ${error.message}` }
  }
  return { ok: true, value: undefined }
}

// Adds a confirmed address to the newsletter segment. Someone who
// unsubscribed earlier and confirms again is resubscribed.
export async function subscribe(env: NewsletterEnv, email: string): Promise<Result> {
  const resend = client(env)
  const existing = await resend.contacts.get({ email })
  if (existing.data) {
    const updated = await resend.contacts.update({ email, unsubscribed: false })
    if (updated.error) return { ok: false, error: `${updated.error.name}: ${updated.error.message}` }
    const segments = await resend.contacts.segments.list({ email })
    if (segments.error) return { ok: false, error: `${segments.error.name}: ${segments.error.message}` }
    if (segments.data.data.some((segment) => segment.id === env.segmentId)) return { ok: true, value: undefined }
    const added = await resend.contacts.segments.add({ email, segmentId: env.segmentId })
    if (added.error) return { ok: false, error: `${added.error.name}: ${added.error.message}` }
    return { ok: true, value: undefined }
  }
  if (existing.error && existing.error.name !== 'not_found') {
    return { ok: false, error: `${existing.error.name}: ${existing.error.message}` }
  }
  const created = await resend.contacts.create({ email, unsubscribed: false, segments: [{ id: env.segmentId }] })
  if (created.error) return { ok: false, error: `${created.error.name}: ${created.error.message}` }
  return { ok: true, value: undefined }
}

// A one-off copy of a post's email to NEWSLETTER_TEST_TO, with the footer's
// unsubscribe link pointing at the site instead of a real subscription
export async function sendPostTest(env: NewsletterEnv, post: PostEmailInput): Promise<Result> {
  if (!env.testTo) return { ok: false, error: 'NEWSLETTER_TEST_TO is not set' }
  const { subject, html, text } = renderPostEmail(post, `${siteConfig.url.replace(/\/$/, '')}/privacy`)
  const { error } = await client(env).emails.send({
    from: env.from,
    to: env.testTo,
    replyTo: env.replyTo,
    subject: `[Test] ${subject}`,
    html,
    text,
  })
  return error ? { ok: false, error: `${error.name}: ${error.message}` } : { ok: true, value: undefined }
}

// Schedules the teaser for every subscriber. Returns the broadcast id so the
// post can record it and never send twice.
export async function schedulePostBroadcast(env: NewsletterEnv, post: PostEmailInput): Promise<Result<string>> {
  const { subject, html, text } = renderPostEmail(post)
  const { data, error } = await client(env).broadcasts.create({
    segmentId: env.segmentId,
    from: env.from,
    replyTo: env.replyTo,
    subject,
    html,
    text,
    name: `Post: ${post.slug}`,
    send: true,
    scheduledAt: SEND_DELAY,
  })
  if (error || !data) return { ok: false, error: error ? `${error.name}: ${error.message}` : 'No broadcast returned' }
  return { ok: true, value: data.id }
}
