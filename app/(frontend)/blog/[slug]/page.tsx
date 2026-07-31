import { getPayloadClient } from '@/lib/payload'
import { Navigation } from '@/components/navigation'
import {
  BlogPostLayout,
  type BlogPostCover,
} from '@/components/blog-post-layout'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type { Metadata } from 'next'
import type { BlogPostTag } from '@/components/blog-section'
import { buildBlogPostMetadata } from '@/lib/build-blog-post-metadata'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params
    const payload = await getPayloadClient()

    const { docs } = await payload.find({
      collection: 'posts',
      where: {
        slug: { equals: slug },
        status: { equals: 'published' },
      },
      limit: 1,
    })

    const post = docs[0]
    if (!post) return { title: 'Post Not Found' }

    return buildBlogPostMetadata(post, slug)
  } catch {
    return { title: 'Post Not Found' }
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const payload = await getPayloadClient()

  const { docs } = await payload.find({
    collection: 'posts',
    where: {
      slug: { equals: slug },
      status: { equals: 'published' },
    },
    limit: 1,
  })

  const post = docs[0]
  if (!post) notFound()

  const cover =
    typeof post.coverImage === 'object' && post.coverImage !== null
      ? (post.coverImage as BlogPostCover)
      : null

  return (
    <div className="relative min-h-screen">
      <Navigation />
      <BlogPostLayout
        title={post.title as string}
        excerpt={post.excerpt as string | undefined}
        publishedAt={post.publishedAt as string | undefined}
        tags={((post.tags as BlogPostTag[]) ?? [])
          .map((t) => t.tag)
          .filter((tag): tag is string => Boolean(tag))}
        cover={cover}
      >
        <RichText data={post.content as SerializedEditorState} />
      </BlogPostLayout>
    </div>
  )
}
