import { getPayloadClient } from '@/lib/payload'
import { Navigation } from '@/components/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import type { Metadata } from 'next'
import type { BlogPost } from '@/components/blog-section'
import { ViewTransition } from '@/lib/view-transition'
import { NewsletterForm } from '@/components/newsletter-form'
import { NEWSLETTER_ENABLED } from '@/lib/newsletter/config'

export const metadata: Metadata = {
  title: 'Blog | Lucas Valbuena',
  description: 'Thoughts on AI, open source, security, and web development.',
  alternates: {
    canonical: '/blog',
  },
}

export const revalidate = 60

export default async function BlogPage() {
  let posts: BlogPost[] = []
  let loadFailed = false
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
    loadFailed = true
  }

  return (
    <div className="relative min-h-screen">
      <Navigation />
      <main id="main-content" tabIndex={-1} className="pt-32 pb-24">
        <div className="mx-auto max-w-2xl px-6">
          <header className="mb-10">
            <h1 className="text-base font-medium text-foreground">Writing</h1>
            <p className="mt-1.5 text-base text-muted-foreground">
              Thoughts on AI, open source, and security.
            </p>
          </header>

          {posts.length === 0 ? (
            <div className="py-16 text-base text-muted-foreground">
              <p>{loadFailed ? 'Posts could not be loaded.' : 'No posts published yet.'}</p>
              <a
                href={loadFailed ? '/blog' : '/'}
                className="mt-3 inline-flex min-h-11 items-center text-foreground underline underline-offset-[5px] decoration-muted-foreground/65 hover:decoration-foreground"
              >
                {loadFailed ? 'Try again' : 'Back to the portfolio'}
              </a>
            </div>
          ) : (
            <div
              className="flex flex-col"
            >
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col items-start gap-1 py-3 -mx-2 px-2 rounded-md transition-colors duration-150 hover:bg-muted/40 active:bg-muted/60 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                >
                  <ViewTransition
                    name={post.slug ? `post-${post.slug}` : undefined}
                    share="morph"
                    default="none"
                  >
                    <span className="min-w-0 break-words text-pretty text-base font-medium text-foreground underline-offset-[5px] decoration-muted-foreground/65 group-hover:underline">
                      {post.title}
                    </span>
                  </ViewTransition>
                  {post.publishedAt && (
                    <time dateTime={post.publishedAt} className="text-sm text-muted-foreground shrink-0 tabular-nums">
                      {format(new Date(post.publishedAt), 'MMM yyyy')}
                    </time>
                  )}
                </Link>
              ))}
            </div>
          )}

          {NEWSLETTER_ENABLED && (
            <div className="mt-12 border-t border-dashed border-border pt-8">
              <NewsletterForm />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
