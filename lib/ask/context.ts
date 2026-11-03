import { format } from 'date-fns'
import { getPayloadClient } from '@/lib/payload'
import { getManifest } from '@/lib/photos'
import { PROJECTS } from '@/lib/projects'
import { notesForPrompt } from '@/lib/ask/notes'
import { siteConfig } from '@/lib/site'
import { CONTACT_EMAIL, CONTACT_LINKS } from '@/lib/contact'

// The agent's knowledge and voice. The live site's prompt isn't published;
// fill these in with your own.
const PROFILE = `Write who you are, what you do, and how to reach you. Contact: email ${CONTACT_EMAIL}. ${CONTACT_LINKS.map((link) => `${link.label}: ${new URL(link.href, siteConfig.url).href}.`).join(' ')}`

const ABOUT = ``

const INSTRUCTIONS = `You answer visitors' questions about the owner of ${siteConfig.url}, using only the profile below. If something isn't in it, say so.

Cards: to show one under your reply, put its tag on its own line at the very end, with the closing tag. At most one per reply.
  <project slug="SLUG"></project> one project. SLUG is one of ${PROJECTS.map((project) => project.slug).join(', ')}.
  <projects></projects> all projects
  <experience></experience> experience
  <posts></posts> blog posts
  <contact></contact> contact details
  <pricing></pricing> pricing
  <photos></photos> recent photos`

type PostSummary = {
  title: string
  slug: string
  excerpt: string
  publishedAt: string
}

const POSTS_TTL_MS = 10 * 60 * 1000
const POSTS_RETRY_MS = 60 * 1000
const POSTS_TIMEOUT_MS = 3000

let postsCache: { expires: number; posts: PostSummary[] } | null = null

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timed out')), ms)),
  ])
}

// Memoized per server instance so a burst of questions doesn't query the
// CMS each time, and so the prompt stays byte-identical for prompt caching
export async function getPosts(): Promise<PostSummary[]> {
  if (postsCache && Date.now() < postsCache.expires) return postsCache.posts
  try {
    const posts = await withTimeout(
      (async () => {
        const payload = await getPayloadClient()
        const { docs } = await payload.find({
          collection: 'posts',
          where: { status: { equals: 'published' } },
          sort: '-publishedAt',
          limit: 30,
          depth: 0,
        })
        return docs.map((post) => ({
          title: post.title ?? '',
          slug: post.slug ?? '',
          excerpt: post.excerpt ?? '',
          publishedAt: post.publishedAt ?? '',
        }))
      })(),
      POSTS_TIMEOUT_MS,
    )
    postsCache = { expires: Date.now() + POSTS_TTL_MS, posts }
    return posts
  } catch {
    // Answer from the rest of the profile while the CMS is unreachable, and
    // retry it soon rather than on every question
    const stale = postsCache?.posts ?? []
    postsCache = { expires: Date.now() + POSTS_RETRY_MS, posts: stale }
    return stale
  }
}

let photosCache: { expires: number; summary: string } | null = null

// A line about the gallery for the profile: how many photos, when, on what,
// and where (stored as "City, Country"; see lib/geocode.ts). Memoized like
// the posts.
async function getPhotoSummary(): Promise<string> {
  if (photosCache && Date.now() < photosCache.expires) return photosCache.summary
  let summary = ''
  try {
    const { photos } = await withTimeout(getManifest({ revalidate: 600 }), POSTS_TIMEOUT_MS)
    if (photos.length > 0) {
      const years = photos
        .map((photo) => photo.metadata.dateTaken?.slice(0, 4))
        .filter((year): year is string => Boolean(year))
        .sort()
      const cameras = new Map<string, number>()
      for (const photo of photos) {
        const camera = photo.metadata.camera
        if (camera) cameras.set(camera, (cameras.get(camera) ?? 0) + 1)
      }
      const camera = [...cameras].sort((a, b) => b[1] - a[1])[0]?.[0]
      const places = [
        ...new Set(
          photos
            .map((photo) => photo.metadata.location?.trim())
            .filter((place): place is string => Boolean(place)),
        ),
      ]
      const span = years.length ? (years[0] === years.at(-1) ? `, taken in ${years[0]}` : `, taken between ${years[0]} and ${years.at(-1)}`) : ''
      summary = `Photography: ${photos.length} of his photos are at ${siteConfig.url}/photos${span}${camera ? `, most of them on ${camera}` : ''}${places.length ? `, with shots from ${places.join('; ')}` : ''}.`
    }
    photosCache = { expires: Date.now() + POSTS_TTL_MS, summary }
  } catch {
    summary = photosCache?.summary ?? ''
    photosCache = { expires: Date.now() + POSTS_RETRY_MS, summary }
  }
  return summary
}

function describeProjects(): string {
  return PROJECTS.map((project) => {
    const links = [
      project.links.demo && `website ${project.links.demo}`,
      project.links.github && `source ${project.links.github}`,
      project.links.paper && `paper ${project.links.paper}`,
    ].filter(Boolean)
    return `- ${project.title}: ${project.fullDescription}${links.length ? ` Links: ${links.join(', ')}.` : ''}`
  }).join('\n')
}

function describePosts(posts: PostSummary[]): string {
  // An empty list usually means the CMS was unreachable, not that there are
  // no posts
  if (posts.length === 0) return `All posts are at ${siteConfig.url}/blog.`
  return posts
    .map((post) => {
      const date = post.publishedAt ? ` (${format(new Date(post.publishedAt), 'MMMM yyyy')})` : ''
      const excerpt = post.excerpt ? ` ${post.excerpt}` : ''
      return `- ${post.title}${date}: ${siteConfig.url}/blog/${post.slug}.${excerpt}`
    })
    .join('\n')
}

// Stable across requests until a post changes, so it can be prompt-cached.
// Anything that varies per request (like today's date) belongs after it.
export async function buildAskSystemPrompt(): Promise<string> {
  const [posts, photos] = await Promise.all([getPosts(), getPhotoSummary()])
  const notes = notesForPrompt()
  return `${INSTRUCTIONS}

<profile>
${PROFILE}

${notes ? `In the owner's own words:\n${notes}\n\n` : ''}${ABOUT}

Projects :
${describeProjects()}

Writing:
${describePosts(posts)}${photos ? `\n\n${photos}` : ''}
</profile>`
}
