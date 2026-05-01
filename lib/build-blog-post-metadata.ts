import type { Metadata } from 'next'

type BlogPostLike = Record<string, unknown> & {
  title?: unknown
  excerpt?: unknown
  coverImage?: unknown
  publishedAt?: unknown
  tags?: unknown
}

export function buildBlogPostMetadata(post: BlogPostLike, slug: string): Metadata {
  const postTitle = typeof post.title === 'string' ? post.title : 'Post'
  const postExcerpt = typeof post.excerpt === 'string' ? post.excerpt : undefined
  const title = `${postTitle} | Lucas Valbuena`
  const description = postExcerpt || 'Read this post on Lucas Valbuena.'
  const canonicalPath = `/blog/${slug}`
  const coverImage =
    typeof post.coverImage === 'object' &&
    post.coverImage !== null &&
    'url' in post.coverImage
      ? (post.coverImage.url as string | undefined)
      : undefined
  const publishedAt = typeof post.publishedAt === 'string' ? post.publishedAt : undefined
  const tags =
    Array.isArray(post.tags) && post.tags.length > 0
      ? (post.tags as { tag?: string }[]).map((t) => t.tag).filter(Boolean)
      : undefined

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonicalPath,
      siteName: 'Lucas Valbuena Portfolio',
      publishedTime: publishedAt,
      tags: tags as string[] | undefined,
      images: coverImage ? [{ url: coverImage, alt: postTitle }] : undefined,
    },
    twitter: {
      card: coverImage ? 'summary_large_image' : 'summary',
      title,
      description,
      creator: '@NotLucknite',
      images: coverImage ? [coverImage] : undefined,
    },
  }
}
