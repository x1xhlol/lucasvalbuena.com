import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'

export type BlogPostCover = {
  url?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
}

// Presentational shell for a post. Kept separate from the route so the body can
// come from Payload's RichText in production and from plain markup in a preview.
export function BlogPostLayout({
  title,
  excerpt,
  publishedAt,
  tags,
  cover,
  children,
}: {
  title: string
  excerpt?: string
  publishedAt?: string
  tags?: string[]
  cover?: BlogPostCover | null
  children: React.ReactNode
}) {
  return (
    <main className="pt-24 pb-24 md:pt-28">
      <article className="mx-auto max-w-2xl px-6">
        <header>
          {publishedAt && (
            <time
              dateTime={publishedAt}
              className="text-sm text-muted-foreground"
            >
              {format(new Date(publishedAt), 'MMMM d, yyyy')}
            </time>
          )}
          <h1 className="mt-3 text-[28px] md:text-[38px] font-semibold tracking-tight leading-[1.12] text-balance text-foreground">
            {title}
          </h1>
          {excerpt && (
            <p className="mt-4 text-[17px] md:text-lg leading-relaxed text-muted-foreground">
              {excerpt}
            </p>
          )}
        </header>

        {cover?.url && (
          <figure className="mt-10">
            {/* Payload gives real dimensions, so the box is reserved before load */}
            <img
              src={cover.url}
              alt={cover.alt ?? ''}
              width={cover.width ?? undefined}
              height={cover.height ?? undefined}
              className="w-full rounded-lg border border-border"
            />
          </figure>
        )}

        <div className="prose-custom mt-10 border-t border-border pt-10">
          {children}
        </div>

        <footer className="mt-16 border-t border-border pt-8">
          {tags && tags.length > 0 && (
            <p className="mb-5 text-xs text-muted-foreground">
              {tags.join(', ')}
            </p>
          )}
          <Link
            href="/blog"
            className="group inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
          >
            <ArrowLeft className="h-3 w-3 transition-transform duration-150 ease-out group-hover:-translate-x-0.5" />
            All posts
          </Link>
        </footer>
      </article>
    </main>
  )
}
