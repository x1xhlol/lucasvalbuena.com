import { ArrowRight } from 'lucide-react'
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
    <Section id="blog" label="Writing" labelClassName="lg:pt-2">
      <div className="space-y-5">
        <div className="flex flex-col">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex items-center gap-1.5 py-2 -mx-2 px-2 rounded-md transition-colors duration-150 hover:bg-muted/40"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-1.5">
                <span className="text-sm font-medium text-foreground sm:shrink-0">
                  {post.title}
                </span>
                {post.excerpt && (
                  <span className="text-sm text-muted-foreground line-clamp-1">
                    {post.excerpt}
                  </span>
                )}
              </div>
              <ArrowRight className="h-3 w-3 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-[color,opacity,transform] duration-150 ease-out shrink-0 self-center opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100" />
            </Link>
          ))}
        </div>

        <div>
          <Link
            href="/blog"
            className="group inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all posts
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform duration-150 ease-out" />
          </Link>
        </div>
      </div>
    </Section>
  )
}
