import type { CollectionAfterChangeHook, PayloadRequest } from 'payload'
import { siteConfig } from '@/lib/site'
import { newsletterEnv } from '@/lib/newsletter/config'
import { schedulePostBroadcast, sendPostTest } from '@/lib/newsletter/send'
import type { PostEmailInput } from '@/lib/newsletter/emails'
import type { Post } from '@/payload-types'

// Saves made by this hook carry this flag so they don't trigger it again
const INTERNAL = 'newsletterInternal'

async function emailInput(doc: Post, req: PayloadRequest): Promise<PostEmailInput> {
  let cover: PostEmailInput['cover'] = null
  const ref = doc.coverImage
  const media =
    typeof ref === 'object' && ref !== null
      ? ref
      : ref
        ? await req.payload.findByID({ collection: 'media', id: ref, depth: 0, req }).catch(() => null)
        : null
  if (media?.url) {
    // Mail clients need absolute image URLs
    cover = { url: new URL(media.url, siteConfig.url).href, alt: media.alt, width: media.width, height: media.height }
  }
  return { title: doc.title, excerpt: doc.excerpt, slug: doc.slug, publishedAt: doc.publishedAt, cover }
}

async function patch(req: PayloadRequest, id: Post['id'], data: Partial<Post>) {
  await req.payload.update({ collection: 'posts', id, data, req, context: { [INTERNAL]: true } })
}

// Runs after every save of a post. Two jobs:
//
// - "Send me a test" emails the teaser to NEWSLETTER_TEST_TO, then turns
//   itself off.
// - The first time a post is published with "Email subscribers" on, it
//   schedules the teaser for every subscriber, 10 minutes out so it can be
//   cancelled in Resend. The send time is recorded before Resend is called,
//   so a second save can't schedule it twice, and cleared again if Resend
//   fails, so publishing again retries. A failure never blocks the save.
export const newsletterAfterChange: CollectionAfterChangeHook<Post> = async ({ doc, previousDoc, req, context }) => {
  if (context[INTERNAL]) return doc
  const env = newsletterEnv()
  if (!env) return doc

  if (doc.newsletterSendTest) {
    const result = await sendPostTest(env, await emailInput(doc, req))
    if (!result.ok) req.payload.logger.error(`[newsletter] test email for "${doc.slug}" failed: ${result.error}`)
    await patch(req, doc.id, { newsletterSendTest: false })
    doc.newsletterSendTest = false
  }

  const firstPublish = doc.status === 'published' && previousDoc?.status !== 'published'
  if (!firstPublish || doc.newsletterSend === false || doc.newsletterSentAt) return doc

  const sentAt = new Date().toISOString()
  await patch(req, doc.id, { newsletterSentAt: sentAt })
  const result = await schedulePostBroadcast(env, await emailInput(doc, req))
  if (!result.ok) {
    req.payload.logger.error(`[newsletter] scheduling "${doc.slug}" failed: ${result.error}`)
    await patch(req, doc.id, { newsletterSentAt: null })
    return doc
  }
  await patch(req, doc.id, { newsletterBroadcastId: result.value })
  return { ...doc, newsletterSentAt: sentAt, newsletterBroadcastId: result.value }
}
