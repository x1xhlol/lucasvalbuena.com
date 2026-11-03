import { ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { Section } from '@/components/section'
import { NewsletterForm } from '@/components/newsletter-form'
import { NEWSLETTER_ENABLED } from '@/lib/newsletter/config'

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  publishedAt: string
  tags?: BlogPostTag[]
}

export type BlogPostTag = {
  tag?: string | null
}

export function BlogSection({ posts }: { posts: BlogPost[] }) {
  // An empty "Writing" heading is worse than no section at all
  if (posts.length === 0) return null

  return (
    <Section id="blog" label="Writing">
      <div>
        <div className="flex flex-col">
          {posts.map((post) => (
            // Same row as the /blog index: a truncated excerpt read as a
            // broken sentence, so the date carries the second slot instead
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex flex-col items-start gap-0.5 py-2 -mx-2 px-2 rounded-md leading-snug transition-colors duration-150 hover:bg-muted/40 active:bg-muted/60 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
            >
              <span className="min-w-0 text-pretty text-base font-medium text-foreground">
                {post.title}
              </span>
              {post.publishedAt && (
                <time
                  dateTime={post.publishedAt}
                  className="shrink-0 text-sm text-muted-foreground tabular-nums"
                >
                  {format(new Date(post.publishedAt), 'MMM yyyy')}
                </time>
              )}
            </Link>
          ))}
        </div>
        {/* One quiet line under the posts: the archive on the left, the
            signup on the right under the dates */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <Link
            href="/blog"
            className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            View all posts
            <ArrowRight className="h-3 w-3 motion-safe:pointer-fine:group-hover:translate-x-0.5 transition-transform duration-150 ease-out" />
          </Link>
          {/* The post rows' hover boxes reach 8px past the text (-mx-2 px-2), so
              the pill reaches out the same 8px: its edge lines up with the
              rows' edge, and its button with the dates */}
          {NEWSLETTER_ENABLED && <NewsletterForm compact className="w-full sm:-mr-2 sm:w-[21rem]" />}
        </div>
      </div>
    </Section>
  )
}
