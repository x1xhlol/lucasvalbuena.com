import { ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { Section } from '@/components/section'

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
      <div className="space-y-5">
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

        <div>
          <Link
            href="/blog"
            className="group inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all posts
            <ArrowRight className="h-3 w-3 motion-safe:pointer-fine:group-hover:translate-x-0.5 transition-transform duration-150 ease-out" />
          </Link>
        </div>
      </div>
    </Section>
  )
}
