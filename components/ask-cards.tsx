'use client'

import { createContext, Suspense, use, useContext, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, Check, Copy, GitFork, Star } from 'lucide-react'
import { format } from 'date-fns'
import { CompanyLogo } from '@/components/company-logo'
import { EASE_OUT, SPRING_SWAP } from '@/lib/motion'
import type { AskCardData, CardName } from '@/lib/ask/cards'
import { CONTACT_EMAIL, CONTACT_LINKS } from '@/lib/contact'
import { EXPERIENCE } from '@/lib/experience'
import { hasCount } from '@/lib/github-api'
import { PROJECT_PARAM, PROJECTS } from '@/lib/projects'
import { formatPlanPrice, ZEROLEAKS_PLAN_TERMS, ZEROLEAKS_PLANS, ZEROLEAKS_PRICING_URL } from '@/lib/zeroleaks'

const CardDataContext = createContext<Promise<AskCardData> | null>(null)

export function AskCardDataProvider({
  data,
  children,
}: {
  data: Promise<AskCardData> | null
  children: React.ReactNode
}) {
  return <CardDataContext value={data}>{children}</CardDataContext>
}

function useCardData(): AskCardData | null {
  const promise = useContext(CardDataContext)
  return promise ? use(promise) : null
}

function CardFrame({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <motion.section
      aria-label={label}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className={`overflow-hidden rounded-2xl bg-background shadow-raised ${className}`}
    >
      {children}
    </motion.section>
  )
}

const ROW =
  'ask-card-row group flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 ease-out pointer-fine:hover:bg-muted/60 active:bg-muted'

const ROW_ITEM = 'first:*:rounded-t-2xl last:*:rounded-b-2xl'

const NEW_TAB = { target: '_blank', rel: 'noopener noreferrer' } as const

function RowArrow({ className = '' }: { className?: string }) {
  return (
    <ArrowUpRight
      className={`size-3.5 shrink-0 text-muted-foreground/70 ${className} transition-[color,translate] duration-150 ease-out pointer-fine:group-hover:text-foreground motion-safe:pointer-fine:group-hover:translate-x-px motion-safe:pointer-fine:group-hover:-translate-y-px`}
      aria-hidden
    />
  )
}

function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      {...NEW_TAB}
      className="group touch-target relative inline-flex items-center gap-[3px] rounded-sm text-[13px] font-medium text-foreground"
    >
      <span className="underline underline-offset-[5px] decoration-muted-foreground/65 transition-colors group-hover:decoration-foreground">
        {children}
      </span>
      <ArrowUpRight
        className="size-[11px] shrink-0 text-muted-foreground/70 transition-[color,translate] duration-150 ease-out group-hover:text-foreground motion-safe:pointer-fine:group-hover:translate-x-px motion-safe:pointer-fine:group-hover:-translate-y-px"
        aria-hidden
      />
    </a>
  )
}

function Shot({
  src,
  sizes,
  className,
  position = 'object-left-top',
}: {
  src: string
  sizes: string
  className: string
  position?: string
}) {
  const [loaded, setLoaded] = useState(false)
  return (
    <span className={`relative shrink-0 overflow-hidden bg-muted ${className}`}>
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        onLoad={() => setLoaded(true)}
        className={`object-cover ${position} transition-opacity duration-200 ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
      <span aria-hidden className="image-outline pointer-events-none absolute inset-0 rounded-[inherit]" />
    </span>
  )
}

function RepoStats({ repo }: { repo: string }) {
  const stats = useCardData()?.stats[repo]
  if (!stats || !hasCount(stats.stars)) return null
  return (
    <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <Star className="size-3" aria-hidden />
        <span className="tabular-nums">{stats.stars}</span>
        <span className="sr-only">stars</span>
      </span>
      {hasCount(stats.forks) && (
        <span className="inline-flex items-center gap-1">
          <GitFork className="size-3" aria-hidden />
          <span className="tabular-nums">{stats.forks}</span>
          <span className="sr-only">forks</span>
        </span>
      )}
    </span>
  )
}

function ProjectCard({ slug }: { slug?: string }) {
  const project = PROJECTS.find((candidate) => candidate.slug === slug)
  if (!project) return null
  return (
    <CardFrame label={`${project.title} project`} className="p-1.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        {project.image && (
          <Shot
            src={project.image}
            sizes="(min-width: 640px) 208px, 100vw"
            className="block aspect-[16/10] w-full rounded-[10px] sm:w-52"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col px-2.5 pb-2 sm:py-1.5 sm:pl-0 sm:pr-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <a
              href={`/?${PROJECT_PARAM}=${project.slug}`}
              {...NEW_TAB}
              className="rounded-sm text-base font-medium text-foreground underline-offset-[5px] decoration-muted-foreground/65 hover:underline"
            >
              {project.title}
            </a>
            {project.repo && (
              <Suspense fallback={null}>
                <RepoStats repo={project.repo} />
              </Suspense>
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">{project.description}</p>
          <div className="mt-auto flex gap-5 pt-3">
            {project.links.demo && <CardLink href={project.links.demo}>Website</CardLink>}
            {project.links.github && <CardLink href={project.links.github}>Source</CardLink>}
          </div>
        </div>
      </div>
    </CardFrame>
  )
}

function ProjectsCard() {
  return (
    <CardFrame label="Projects">
      <ul className="divide-y divide-border">
        {PROJECTS.map((project) => (
          <li key={project.slug} className={ROW_ITEM}>
            <a href={project.links.demo ?? project.links.github} {...NEW_TAB} className={ROW}>
              {project.image && (
                <Shot src={project.image} sizes="64px" className="hidden aspect-[16/10] w-16 rounded-md sm:block" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">{project.title}</span>
                <span className="block text-sm text-muted-foreground text-pretty">{project.description}</span>
              </span>
              <RowArrow />
            </a>
          </li>
        ))}
      </ul>
    </CardFrame>
  )
}

function ExperienceCard() {
  return (
    <CardFrame label="Experience">
      <ul className="divide-y divide-border">
        {EXPERIENCE.map((item) => (
          <li key={item.company} className={ROW_ITEM}>
            <a href={item.href} {...NEW_TAB} className={ROW}>
              <CompanyLogo company={item.company} className="relative mt-0.5 block size-4 shrink-0 self-start" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">{item.company}</span>
                <span className="block text-sm text-muted-foreground">{item.role}</span>
              </span>
              <span className="shrink-0 self-start whitespace-nowrap text-sm text-muted-foreground tabular-nums">{item.dates}</span>
              <RowArrow className="mt-[3px] self-start" />
            </a>
          </li>
        ))}
      </ul>
    </CardFrame>
  )
}

const POSTS_SHOWN = 5

function PostsCard() {
  const posts = useCardData()?.posts.slice(0, POSTS_SHOWN) ?? []
  return (
    <CardFrame label="Writing">
      <ul className="divide-y divide-border">
        {posts.map((post) => (
          <li key={post.slug} className={ROW_ITEM}>
            <a href={`/blog/${post.slug}`} {...NEW_TAB} className={ROW}>
              <span className="min-w-0 flex-1 text-sm font-medium text-foreground text-pretty">{post.title}</span>
              {post.publishedAt && (
                <time dateTime={post.publishedAt} className="shrink-0 whitespace-nowrap text-sm text-muted-foreground tabular-nums">
                  {format(new Date(post.publishedAt), 'MMM yyyy')}
                </time>
              )}
              <RowArrow />
            </a>
          </li>
        ))}
        <li className={ROW_ITEM}>
          <a href="/blog" {...NEW_TAB} className={ROW}>
            <span className="min-w-0 flex-1 text-sm text-muted-foreground">All writing</span>
            <RowArrow />
          </a>
        </li>
      </ul>
    </CardFrame>
  )
}

const ICON_SWAP = {
  scale: SPRING_SWAP,
  opacity: { duration: 0.16, ease: EASE_OUT },
  filter: { duration: 0.16, ease: EASE_OUT },
} as const

function EmailRow() {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
    } catch {
      window.location.href = `mailto:${CONTACT_EMAIL}`
      return
    }
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 1500)
  }
  return (
    <>
      <button type="button" onClick={copy} aria-label={`Copy email address ${CONTACT_EMAIL}`} className={ROW}>
        <span className={CONTACT_LABEL}>Email</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{CONTACT_EMAIL}</span>
        <span className="relative inline-flex size-3.5 shrink-0" aria-hidden>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={copied ? 'copied' : 'copy'}
              initial={{ opacity: 0, scale: 0.5, filter: 'blur(2px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.5, filter: 'blur(2px)' }}
              transition={ICON_SWAP}
              className="absolute inset-0"
            >
              {copied ? (
                <Check className="size-3.5 text-foreground" />
              ) : (
                <Copy className="size-3.5 text-muted-foreground/70 transition-colors duration-150 ease-out pointer-fine:group-hover:text-foreground" />
              )}
            </motion.span>
          </AnimatePresence>
        </span>
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Email address copied' : ''}
      </span>
    </>
  )
}

const CONTACT_LABEL = 'w-20 shrink-0 text-sm text-muted-foreground'

function ContactCard() {
  return (
    <CardFrame label="Contact">
      <ul className="divide-y divide-border">
        <li className={ROW_ITEM}>
          <EmailRow />
        </li>
        {CONTACT_LINKS.map((link) => (
          <li key={link.label} className={ROW_ITEM}>
            <a href={link.href} {...NEW_TAB} className={ROW}>
              <span className={CONTACT_LABEL}>{link.label}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{link.value}</span>
              <RowArrow />
            </a>
          </li>
        ))}
      </ul>
    </CardFrame>
  )
}

function KeepHyphenated({ text }: { text: string }) {
  return text.split(/(\S+-\S+)/).map((piece, index) =>
    index % 2 ? (
      <span key={index} className="whitespace-nowrap">
        {piece}
      </span>
    ) : (
      piece
    ),
  )
}

function PricingCard() {
  return (
    <CardFrame label="ZeroLeaks pricing">
      <ul className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        {ZEROLEAKS_PLANS.map((plan) => (
          <li key={plan.name} className="flex flex-col bg-background px-4 py-3">
            <span className="text-sm text-muted-foreground">{plan.name}</span>
            <span className="mt-0.5 text-lg font-medium text-foreground tabular-nums">
              {formatPlanPrice(plan)}
              {plan.monthly !== null && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
            </span>
            <span className="mt-1 text-xs leading-snug text-muted-foreground text-pretty">
              <KeepHyphenated text={plan.detail} />
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-2.5">
        <span className="text-xs text-muted-foreground text-pretty">{ZEROLEAKS_PLAN_TERMS}</span>
        <CardLink href={ZEROLEAKS_PRICING_URL}>Pricing</CardLink>
      </div>
    </CardFrame>
  )
}

function PhotosCard() {
  const photos = useCardData()?.photos
  const latest = photos?.latest ?? []
  return (
    <CardFrame label="Photos">
      <a href="/photos" {...NEW_TAB} className="ask-card-row group block rounded-2xl">
        {latest.length > 0 && (
          <span className="grid grid-cols-2 gap-1.5 p-1.5 pb-0 sm:grid-cols-4">
            {latest.map((photo) => (
              <Shot
                key={photo.url}
                src={photo.url}
                sizes="(min-width: 640px) 160px, 50vw"
                className="block aspect-square rounded-[10px]"
                position="object-center"
              />
            ))}
          </span>
        )}
        <span className="flex min-h-12 items-center gap-3 px-4 py-2.5 transition-colors duration-150 ease-out pointer-fine:group-hover:bg-muted/60 group-active:bg-muted">
          <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
            {photos && photos.total > 0 ? `All ${photos.total} photos` : 'Photos'}
          </span>
          <RowArrow />
        </span>
      </a>
    </CardFrame>
  )
}

function PostsFallback() {
  return <div aria-hidden className="h-[145px] rounded-2xl bg-muted/50" />
}

function PhotosFallback() {
  return <div aria-hidden className="aspect-[2/1] rounded-2xl bg-muted/50 sm:aspect-[4/1.25]" />
}

export function AskCard({ name, slug }: { name: CardName; slug?: string }) {
  switch (name) {
    case 'project':
      return <ProjectCard slug={slug} />
    case 'projects':
      return <ProjectsCard />
    case 'experience':
      return <ExperienceCard />
    case 'posts':
      return (
        <Suspense fallback={<PostsFallback />}>
          <PostsCard />
        </Suspense>
      )
    case 'contact':
      return <ContactCard />
    case 'pricing':
      return <PricingCard />
    case 'photos':
      return (
        <Suspense fallback={<PhotosFallback />}>
          <PhotosCard />
        </Suspense>
      )
  }
}
