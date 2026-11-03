import { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/site'
import { getPayloadClient } from '@/lib/payload'
import { ASK_ENABLED } from '@/lib/ask/protocol'

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
    ...(ASK_ENABLED
      ? [{ url: `${siteConfig.url}/ask`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5 }]
      : []),
    { url: `${siteConfig.url}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    ...(await getPostEntries()),
  ]
}
