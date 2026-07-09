import { getPayloadClient } from '@/lib/payload'
import { Navigation } from '@/components/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import type { Metadata } from 'next'
import type { BlogPost } from '@/components/blog-section'

export const metadata: Metadata = {
  title: 'Blog | Lucas Valbuena',
  description: 'Thoughts on AI, open source, security, and web development.',
}

export const dynamic = 'force-dynamic'

export default async function BlogPage() {
  let posts: BlogPost[] = []
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'posts',
      where: {
        status: { equals: 'published' },
      },
      sort: '-publishedAt',
      limit: 50,
    })
    posts = result.docs.map((post) => ({
      id: String(post.id),
      title: post.title ?? '',
      slug: post.slug ?? '',
      excerpt: post.excerpt ?? '',
      publishedAt: post.publishedAt ?? '',
      tags: post.tags ?? undefined,
    }))
  } catch {
    posts = []
  }

  return (
    <div className="relative min-h-screen">
      <Navigation />
      <main className="pt-32 pb-24">
        <div className="mx-auto max-w-2xl px-6">
          <header className="mb-16 text-center">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              Blog
            </p>
          </header>

          {posts.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-muted-foreground">
                No posts yet. Check back soon!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex items-baseline justify-between gap-4 py-4 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground group-hover:text-muted-foreground transition-colors truncate">
                    {post.title}
                  </span>
                  {post.publishedAt && (
                    <span className="text-xs font-mono text-muted-foreground shrink-0 tabular-nums">
                      {format(new Date(post.publishedAt), 'MMM d, yyyy')}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
