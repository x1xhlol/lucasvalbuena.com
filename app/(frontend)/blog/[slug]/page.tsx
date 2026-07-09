import { getPayloadClient } from '@/lib/payload'
import { Navigation } from '@/components/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
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

  return (
    <div className="relative min-h-screen">
      <Navigation />
      <main className="pt-32 pb-24">
        <article className="mx-auto max-w-2xl px-6">
          <header className="mb-10 text-center">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">
              Blog
            </p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-tight mb-6">
              {post.title as string}
            </h1>
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground font-mono">
              {post.publishedAt && (
                <time>{format(new Date(post.publishedAt as string), 'MMMM d, yyyy')}</time>
              )}
              {post.tags && post.tags.length > 0 && (
                <div className="flex items-center gap-2">
                  {(post.tags as BlogPostTag[]).map((t, i) => (
                    <span key={i}>{t.tag}</span>
                  ))}
                </div>
              )}
            </div>
          </header>

          <div className="border-t border-border pt-10">
            <div className="prose-custom">
              <RichText data={post.content as SerializedEditorState} />
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-border">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              All posts
            </Link>
          </div>
        </article>
      </main>
    </div>
  )
}
