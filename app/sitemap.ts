import { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/site'
import { getPayloadClient } from '@/lib/payload'

// Posts are published from the CMS, so a statically generated sitemap would
// freeze the list at build time.
export const dynamic = 'force-dynamic'

type PostRow = {
  slug?: string | null
  publishedAt?: string | null
  updatedAt?: string | null
}

async function getPostEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'posts',
      where: { status: { equals: 'published' } },
      sort: '-publishedAt',
      limit: 500,
    })

    return (docs as PostRow[])
      .filter((post): post is PostRow & { slug: string } => Boolean(post.slug))
      .map((post) => ({
        url: `${siteConfig.url}/blog/${post.slug}`,
        lastModified: new Date(post.updatedAt ?? post.publishedAt ?? Date.now()),
        changeFrequency: 'yearly' as const,
        priority: 0.6,
      }))
  } catch {
    // A database outage should still leave a valid sitemap for the static routes
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  return [
    {
      url: siteConfig.url,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${siteConfig.url}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${siteConfig.url}/photos`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...(await getPostEntries()),
  ]
}
