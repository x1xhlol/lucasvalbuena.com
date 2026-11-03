import { getPayloadClient } from '@/lib/payload'
import { siteConfig } from '@/lib/site'

export const dynamic = 'force-static'
export const revalidate = 60

const XML_ENTITIES: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => XML_ENTITIES[character])
}

export async function GET() {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'posts',
    where: { status: { equals: 'published' } },
    sort: '-publishedAt',
    limit: 50,
    select: { title: true, slug: true, excerpt: true, publishedAt: true },
  })
  const blogUrl = new URL('/blog', siteConfig.url).href
  const feedUrl = new URL('/blog/rss.xml', siteConfig.url).href
  const items = docs.map((post) => {
    const url = escapeXml(new URL(`/blog/${encodeURIComponent(post.slug)}`, siteConfig.url).href)
    return `<item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.excerpt)}</description>
      ${post.publishedAt ? `<pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>` : ''}
    </item>`
  }).join('\n')

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Writing by Lucas Valbuena</title>
    <link>${escapeXml(blogUrl)}</link>
    <description>Thoughts on AI, open source, and security.</description>
    <language>en</language>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
