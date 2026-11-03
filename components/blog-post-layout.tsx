import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { ViewTransition } from '@/lib/view-transition'
import { NewsletterForm } from '@/components/newsletter-form'
import { NEWSLETTER_ENABLED } from '@/lib/newsletter/config'

export type AdjacentPost = {
  title: string
  slug: string
}

export type BlogPostCover = {
  url?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
}

export function BlogPostLayout({
  title,
  slug,
  excerpt,
  publishedAt,
  tags,
  cover,
  newerPost,
  olderPost,
  children,
}: {
  title: string
  slug?: string
  excerpt?: string
  publishedAt?: string
  tags?: string[]
  cover?: BlogPostCover | null
  newerPost?: AdjacentPost | null
  olderPost?: AdjacentPost | null
  children: React.ReactNode
}) {
  return (
    <main id="main-content" tabIndex={-1} className="pt-24 pb-24 md:pt-28">
      <article className="mx-auto max-w-2xl px-6">
        <Link
          href="/blog"
          className="group mb-10 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3 transition-transform duration-150 ease-out motion-safe:pointer-fine:group-hover:-translate-x-0.5" />
          Writing
        </Link>

        <header>
          <ViewTransition
            name={slug ? `post-${slug}` : undefined}
            share="morph"
            default="none"
          >
            <h1 className="break-words text-base font-medium leading-relaxed text-balance text-foreground">
              {title}
            </h1>
          </ViewTransition>
          {publishedAt && (
            <time
              dateTime={publishedAt}
              className="mt-1 block text-base text-muted-foreground tabular-nums"
            >
              {format(new Date(publishedAt), 'MMMM d, yyyy')}
            </time>
          )}
          {excerpt && (
            <p className="mt-4 break-words text-base leading-relaxed text-muted-foreground">
              {excerpt}
            </p>
          )}
        </header>

        {cover?.url && (
          <figure className="mt-10">
            <Image
              src={cover.url}
              alt={cover.alt ?? ''}
              width={cover.width ?? 1600}
              height={cover.height ?? 900}
              sizes="(max-width: 704px) 100vw, 656px"
              quality={95}
              priority
              className="image-outline w-full rounded-lg"
            />
          </figure>
        )}

        <div className="prose-custom mt-10 border-t border-dashed border-border pt-10">
          {children}
        </div>

        <footer className="mt-16 border-t border-dashed border-border pt-8">
          {NEWSLETTER_ENABLED && <NewsletterForm className="mb-12" />}
          {(newerPost || olderPost) && (
            <nav aria-label="Adjacent posts" className="mb-10 grid grid-cols-2 gap-6">
              <div>
                {newerPost && (
                  <Link href={`/blog/${newerPost.slug}`} className="group inline-flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Newer</span>
                    <span className="text-base font-medium text-foreground underline-offset-[5px] decoration-muted-foreground/65 group-hover:underline">
                      {newerPost.title}
                    </span>
                  </Link>
                )}
              </div>
              <div className="text-right">
                {olderPost && (
                  <Link href={`/blog/${olderPost.slug}`} className="group inline-flex flex-col items-end gap-1">
                    <span className="text-sm text-muted-foreground">Older</span>
                    <span className="text-base font-medium text-foreground underline-offset-[5px] decoration-muted-foreground/65 group-hover:underline">
                      {olderPost.title}
                    </span>
                  </Link>
                )}
              </div>
            </nav>
          )}
          <div className="flex items-baseline justify-between gap-4">
            <Link
              href="/blog"
              className="group inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              <ArrowLeft className="h-3 w-3 transition-transform duration-150 ease-out motion-safe:pointer-fine:group-hover:-translate-x-0.5" />
              All posts
            </Link>
            {tags && tags.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {tags.join(', ')}
              </p>
            )}
          </div>
        </footer>
      </article>
    </main>
  )
}
