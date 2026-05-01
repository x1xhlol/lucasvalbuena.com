'use client'

import { ArrowRight } from 'lucide-react'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'

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
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in')
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px',
      },
    )

    const elements = sectionRef.current?.querySelectorAll('.animate-on-scroll')
    elements?.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <section
      id="blog"
      data-nosnippet=""
      className="relative py-10 md:py-12"
      ref={sectionRef}
    >
      <div className="mx-auto max-w-5xl px-6 md:px-12 relative z-10">
        <div className="max-w-2xl mx-auto space-y-6 md:space-y-7">
          <h2 className="text-sm md:text-base font-medium text-foreground animate-on-scroll">
            Writing
          </h2>

          {posts.length === 0 ? (
            <div className="animate-on-scroll py-2">
              <p className="text-sm text-muted-foreground">
                No posts yet. Check back soon!
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {posts.map((post, index) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="animate-on-scroll group flex items-baseline gap-1.5 py-2 -mx-2 px-2 rounded-md transition-colors duration-150 hover:bg-muted/40"
                  style={{ transitionDelay: `${index * 60}ms` }}
                >
                  <span className="text-sm font-medium text-foreground shrink-0">
                    {post.title}
                  </span>
                  {post.excerpt && (
                    <span className="text-sm text-muted-foreground line-clamp-1">
                      {post.excerpt}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}

          {posts.length > 0 && (
            <div className="animate-on-scroll">
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
