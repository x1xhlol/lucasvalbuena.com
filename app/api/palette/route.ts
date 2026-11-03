import { NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'

export const revalidate = 60

export async function GET() {
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'posts',
      where: { status: { equals: 'published' } },
      sort: '-publishedAt',
      limit: 50,
    })
    return NextResponse.json({
      posts: result.docs.map((post) => ({
        title: post.title ?? '',
        slug: post.slug ?? '',
        publishedAt: post.publishedAt ?? null,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Posts could not be loaded' }, { status: 503 })
  }
}
