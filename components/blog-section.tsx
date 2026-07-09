import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

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
  return (
    <section
      id="blog"
      data-nosnippet=""
      className="relative py-10 md:py-12"
    >
      <div className="mx-auto max-w-5xl px-6 md:px-12 relative z-10">
        <div className="max-w-2xl mx-auto space-y-6 md:space-y-7">
          <h2 className="text-sm md:text-base font-medium text-foreground">
            Writing
          </h2>

          {posts.length === 0 ? (
            <div className="py-2">
              <p className="text-sm text-muted-foreground">
                No posts yet. Check back soon!
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex items-baseline gap-1.5 py-2 -mx-2 px-2 rounded-md transition-colors duration-150 hover:bg-muted/40"
                >
                  <span className="text-sm font-medium text-foreground shrink-0">
                    {post.title}
                  </span>
                  {post.excerpt && (
                    <span className="text-sm text-muted-foreground line-clamp-1">
                      {post.excerpt}
                    </span>
                  )}
                  <ArrowRight className="h-3 w-3 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-[color,opacity,transform] duration-150 ease-out shrink-0 ml-auto self-center opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100" />
                </Link>
              ))}
            </div>
          )}

          {posts.length > 0 && (
            <div>
              <Link
                href="/blog"
                className="group inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View all posts
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
