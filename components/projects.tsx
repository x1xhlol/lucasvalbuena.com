'use client'

import {
  Star,
  GitFork,
  ArrowUpRight,
  Calendar,
  Plus,
  Shield,
  Code2,
  Maximize2,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import { Drawer } from 'vaul'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_OUT } from '@/lib/motion'
import { formatGithubThousands } from '@/lib/github-api'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useEffect, useRef, useState } from 'react'

// Shared-element morph between a project row and its details panel
const MORPH = { type: 'spring', duration: 0.45, bounce: 0.15 } as const

// Panel content fades in after the card morph is underway, and drops out
// quickly before the card shrinks back into the row
const contentFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, delay: 0.1, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: EASE_OUT } },
} as const

interface Project {
  title: string
  subtitle: string
  description: string
  fullDescription: string
  image?: string
  stats?: {
    stars: string
    forks: string
  } | null
  links: {
    github?: string
    demo?: string
  }
  icon: LucideIcon
}

function ProjectLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-[3px] text-[13px] font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 rounded-sm"
    >
      <span className="underline underline-offset-[5px] decoration-muted-foreground/65 group-hover:decoration-foreground transition-colors">
        {children}
      </span>
      <ArrowUpRight
        className="h-[11px] w-[11px] shrink-0 text-muted-foreground/70 transition-[color,transform] duration-150 ease-out group-hover:text-foreground group-hover:translate-x-[1px] group-hover:-translate-y-[1px]"
        aria-hidden
      />
    </a>
  )
}

function ProjectImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  if (errored) {
    return (
      <span className="flex h-full w-full items-center justify-center">
        <span className="text-muted-foreground font-mono text-xs text-center px-6">
          [ image unavailable ]
        </span>
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      ref={(el) => {
        // onLoad doesn't fire for images already complete before hydration
        if (el?.complete) setLoaded(true)
      }}
      onLoad={() => setLoaded(true)}
      onError={() => setErrored(true)}
      className={`h-full w-full object-contain transition-opacity duration-200 ease-out ${
        loaded ? 'opacity-100' : 'opacity-0'
      }`}
    />
  )
}

function ProjectFooter({ project }: { project: Project }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
      <div className="flex items-center gap-5">
        {project.links.demo && (
          <ProjectLink href={project.links.demo}>Website</ProjectLink>
        )}
        {project.links.github && (
          <ProjectLink href={project.links.github}>Source</ProjectLink>
        )}
      </div>
      {project.stats && (
        <div className="flex items-center gap-3.5 text-xs text-muted-foreground">
          <span
            className="inline-flex items-center gap-1"
            aria-label={`${project.stats.stars} stars`}
          >
            <Star className="h-3 w-3" aria-hidden />
            <span className="font-mono tabular-nums">{project.stats.stars}</span>
          </span>
          <span
            className="inline-flex items-center gap-1"
            aria-label={`${project.stats.forks} forks`}
          >
            <GitFork className="h-3 w-3" aria-hidden />
            <span className="font-mono tabular-nums">{project.stats.forks}</span>
          </span>
        </div>
      )}
    </div>
  )
}

function ProjectDetails({
  project,
  Title,
  Description,
  onEnlarge,
}: {
  project: Project
  Title: React.ElementType
  Description: React.ElementType
  onEnlarge: (image: { src: string; alt: string }) => void
}) {
  return (
    <>
      {project.image && (
        <div className="relative w-full shrink-0 border-y border-border bg-muted/40">
          <button
            type="button"
            aria-label={`Open ${project.title} image preview`}
            className="group/image block w-full cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-inset"
            onClick={() =>
              onEnlarge({
                src: project.image!,
                alt: project.title,
              })
            }
          >
            <span className="relative block aspect-[16/9] sm:aspect-[16/10] w-full overflow-hidden p-2 sm:p-3">
              <span className="pointer-events-none absolute bottom-3 right-3 inline-flex size-8 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground backdrop-blur transition-opacity duration-150 opacity-70">
                <Maximize2 className="size-3.5" />
              </span>
              <ProjectImage src={project.image} alt={project.title} />
            </span>
          </button>
        </div>
      )}

      <div className="p-5 sm:p-7">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.18em]">
          {project.subtitle}
        </p>
        <Title className="mt-2 text-[17px] sm:text-lg font-semibold tracking-tight leading-snug text-foreground">
          {project.title}
        </Title>
        <Description className="mt-2.5 sm:mt-3 text-sm sm:text-[15px] leading-relaxed text-foreground/85">
          {project.fullDescription}
        </Description>

        <div className="mt-5 sm:mt-6">
          <ProjectFooter project={project} />
        </div>
      </div>
    </>
  )
}

const STATS_REPOS = [
  'x1xhlol/system-prompts-and-models-of-ai-tools',
  'x1xhlol/zero-calendar',
  'x1xhlol/better-clawd',
]

export function Projects() {
  const [repoStats, setRepoStats] = useState<
    Record<string, { stars: string; forks: string }>
  >({})
  const [enlargedImage, setEnlargedImage] = useState<{
    src: string
    alt: string
  } | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 640px)')
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const enlargedOpenRef = useRef(false)
  enlargedOpenRef.current = Boolean(enlargedImage)

  const desktopPanelOpen = detailsOpen && isDesktop

  // The morph panel replaces Radix Dialog on desktop, so dialog behavior
  // (Esc, focus trap, focus return, scroll lock) is handled here
  useEffect(() => {
    if (!desktopPanelOpen) return
    returnFocusRef.current = document.activeElement as HTMLElement | null
    panelRef.current?.focus({ preventScroll: true })

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // The image preview dialog stacks on top and handles its own Escape
        if (!enlargedOpenRef.current) setDetailsOpen(false)
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      returnFocusRef.current?.focus({ preventScroll: true })
    }
  }, [desktopPanelOpen])

  useEffect(() => {
    const fetchRepoStats = async (repo: string) => {
      try {
        const response = await fetch(`https://api.github.com/repos/${repo}`, {
          headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        })
        const data = (await response.json()) as {
          message?: string
          stargazers_count?: number
          forks_count?: number
        }

        if (!response.ok || typeof data.stargazers_count !== 'number') {
          setRepoStats((prev) => ({ ...prev, [repo]: { stars: '—', forks: '—' } }))
          return
        }

        const stars = formatGithubThousands(data.stargazers_count)
        setRepoStats((prev) => ({
          ...prev,
          [repo]: {
            stars,
            forks:
              typeof data.forks_count === 'number'
                ? formatGithubThousands(data.forks_count)
                : '—',
          },
        }))
      } catch (error) {
        console.error(`Failed to fetch GitHub stats for ${repo}:`, error)
        setRepoStats((prev) => ({ ...prev, [repo]: { stars: '—', forks: '—' } }))
      }
    }

    STATS_REPOS.forEach(fetchRepoStats)
  }, [])

  useEffect(() => {
    projects.forEach((project) => {
      if (project.image) {
        const img = new Image()
        img.src = project.image
      }
    })
  }, [])

  const projects: Project[] = [
    {
      title: 'System Prompts and Models of AI Tools',
      subtitle: 'AI Research / Open Source',
      description: 'Reverse-engineered system prompts from major AI coding assistants including v0, Cursor, and Windsurf.',
      fullDescription: 'This repository contains reverse-engineered system prompts from major AI coding assistants. I extract, document, and analyze the internal instructions that tools like v0, Cursor, Manus, and Windsurf use to guide their LLMs. The goal is transparency: developers can understand how these tools work and improve their own prompt engineering.',
      image: 'https://xobhe5j5syssmps0.public.blob.vercel-storage.com/Screenshot%202026-01-07%20152543.png',
      stats: repoStats['x1xhlol/system-prompts-and-models-of-ai-tools'] ?? null,
      links: {
        github: 'https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools',
      },
      icon: Code2,
    },
    {
      title: 'ZeroLeaks',
      subtitle: 'Cybersecurity / SaaS',
      description: 'Security testing platform for LLM applications to identify prompt extraction vulnerabilities.',
      fullDescription: 'ZeroLeaks is a security platform built to help companies test their LLM deployments. It simulates prompt injection and extraction attacks to identify if system prompts can be leaked. The platform provides detailed reports and remediation strategies to harden AI applications against these attack vectors.',
      image: '/projects/zeroleaks.png',
      links: {
        github: 'https://github.com/ZeroLeaks/zeroleaks',
        demo: 'https://zeroleaks.ai',
      },
      icon: Shield,
    },
    {
      title: 'Zero Calendar',
      subtitle: 'Productivity',
      description: 'AI-powered calendar with natural language event creation and Google Calendar sync.',
      fullDescription: 'Zero Calendar is an open-source scheduling tool. Instead of clicking through date pickers, you type natural language like "lunch with Alex next Tuesday at noon" and it parses everything automatically. It syncs with Google Calendar and supports recurring events.',
      image: '/projects/zero-calendar.png',
      stats: repoStats['x1xhlol/zero-calendar'] ?? null,
      links: {
        github: 'https://github.com/x1xhlol/zero-calendar',
      },
      icon: Calendar,
    },
    {
      title: 'Better-Clawd',
      subtitle: 'Developer Tools / CLI',
      description: 'A faster, telemetry-free Claude Code fork with OpenAI, OpenRouter, and Anthropic support.',
      fullDescription: 'Better-Clawd is an independent Claude Code fork focused on performance, provider flexibility, and local-first behavior. It keeps the original CLI experience that worked, removes telemetry, reduces vendor lock-in, and adds support for OpenAI, OpenRouter, and Anthropic without turning setup into a science project.',
      image: '/projects/better-clawd-terminal.png',
      stats: repoStats['x1xhlol/better-clawd'] ?? null,
      links: {
        github: 'https://github.com/x1xhlol/better-clawd',
      },
      icon: Code2,
    },
  ]

  const activeProject = activeIndex === null ? null : projects[activeIndex]

  return (
    <section
      id="projects"
      data-nosnippet=""
      className="relative pt-10 pb-10 md:pb-12"
    >
      <div className="mx-auto max-w-5xl px-6 md:px-12 relative z-10">
        <div className="max-w-2xl mx-auto space-y-6 md:space-y-7">
          <h2 className="text-sm md:text-base font-medium text-foreground">
            Projects
          </h2>

          <div className="flex flex-col">
            {projects.map((project, index) => (
              <motion.button
                key={project.title}
                layoutId={`project-card-${index}`}
                transition={MORPH}
                style={{ borderRadius: 8 }}
                type="button"
                aria-haspopup="dialog"
                onClick={() => {
                  setActiveIndex(index)
                  setDetailsOpen(true)
                }}
                className="group relative w-full text-left cursor-pointer py-2 -mx-2 px-2 rounded-md transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
              >
                <div className="flex items-baseline gap-1.5 leading-snug">
                  <motion.span
                    layoutId={`project-title-${index}`}
                    transition={MORPH}
                    className="text-sm font-medium text-foreground shrink-0"
                  >
                    {project.title}
                  </motion.span>
                  <span className="text-sm text-muted-foreground line-clamp-1">
                    {project.description}
                  </span>
                  <Plus className="h-3 w-3 text-muted-foreground/60 group-hover:text-foreground transition-[color,opacity,transform] duration-150 ease-out shrink-0 ml-auto self-center opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 pointer-coarse:opacity-100 pointer-coarse:scale-100" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {desktopPanelOpen && activeProject && activeIndex !== null && (
          <>
            <motion.div
              key="project-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setDetailsOpen(false)}
            />
            <div
              key="project-panel"
              className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-6"
            >
              <motion.div
                ref={panelRef}
                layoutId={`project-card-${activeIndex}`}
                transition={MORPH}
                style={{ borderRadius: 16 }}
                role="dialog"
                aria-modal="true"
                aria-label={activeProject.title}
                tabIndex={-1}
                className="pointer-events-auto relative w-full max-w-xl overflow-hidden border border-border bg-background shadow-xl outline-none"
              >
                <div className="max-h-[85dvh] overflow-y-auto custom-scrollbar overscroll-contain p-6 sm:p-7">
                  <motion.p
                    {...contentFade}
                    className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.18em]"
                  >
                    {activeProject.subtitle}
                  </motion.p>
                  <motion.h2
                    layoutId={`project-title-${activeIndex}`}
                    transition={MORPH}
                    className="mt-2 w-fit text-[17px] font-semibold tracking-tight leading-snug text-foreground"
                  >
                    {activeProject.title}
                  </motion.h2>
                  <motion.div {...contentFade}>
                    <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-foreground/85">
                      {activeProject.fullDescription}
                    </p>
                    {activeProject.image && (
                      <button
                        type="button"
                        aria-label={`Open ${activeProject.title} image preview`}
                        onClick={() =>
                          setEnlargedImage({
                            src: activeProject.image!,
                            alt: activeProject.title,
                          })
                        }
                        className="group/image relative mt-5 block w-full cursor-zoom-in overflow-hidden rounded-lg border border-border bg-muted/40 outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                      >
                        <span className="relative block aspect-[16/10] w-full p-2">
                          <span className="pointer-events-none absolute bottom-3 right-3 z-10 inline-flex size-8 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground backdrop-blur transition-opacity duration-150 opacity-0 group-hover/image:opacity-100 group-focus-visible/image:opacity-100 pointer-coarse:opacity-70">
                            <Maximize2 className="size-3.5" />
                          </span>
                          <ProjectImage src={activeProject.image} alt={activeProject.title} />
                        </span>
                      </button>
                    )}
                    <div className="mt-5">
                      <ProjectFooter project={activeProject} />
                    </div>
                  </motion.div>
                </div>
                <motion.button
                  {...contentFade}
                  type="button"
                  aria-label="Close"
                  onClick={() => setDetailsOpen(false)}
                  className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground backdrop-blur transition-colors duration-150 hover:bg-muted/80 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                >
                  <X className="h-3.5 w-3.5" />
                </motion.button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <Drawer.Root open={detailsOpen && !isDesktop} onOpenChange={setDetailsOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[94dvh] flex-col rounded-t-[20px] border-t border-border bg-background outline-none">
            <div
              aria-hidden
              className="mx-auto mt-3 h-1 w-9 shrink-0 rounded-full bg-muted-foreground/25"
            />
            {activeProject && (
              <div className="mt-3 overflow-y-auto overscroll-contain pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                <ProjectDetails
                  project={activeProject}
                  Title={Drawer.Title}
                  Description={Drawer.Description}
                  onEnlarge={setEnlargedImage}
                />
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <Dialog
        open={Boolean(enlargedImage)}
        onOpenChange={(open) => {
          if (!open) {
            setEnlargedImage(null)
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-3rem)]"
        >
          <DialogTitle className="sr-only">
            {enlargedImage ? `${enlargedImage.alt} image preview` : 'Project image preview'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Enlarged project screenshot.
          </DialogDescription>
          {enlargedImage && (
            <div className="flex max-h-[calc(100dvh-1rem)] min-h-[40dvh] w-full items-center justify-center bg-muted/40 p-2 sm:max-h-[calc(100vh-3rem)] sm:p-4">
              <img
                src={enlargedImage.src}
                alt={enlargedImage.alt}
                className="max-h-[calc(100dvh-2rem)] w-auto max-w-full object-contain sm:max-h-[calc(100vh-5rem)]"
              />
            </div>
          )}
          <DialogClose
            aria-label="Close"
            className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-full bg-background/80 backdrop-blur border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
          >
            <X className="size-3.5" />
          </DialogClose>
        </DialogContent>
      </Dialog>
    </section>
  )
}
