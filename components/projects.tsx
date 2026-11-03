'use client'

import { Star, GitFork, ArrowUpRight, ChevronRight, Maximize2, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import Image, { getImageProps } from 'next/image'
import { track } from '@vercel/analytics'
import { Drawer } from 'vaul'
import { AnimatePresence, motion } from 'motion/react'
import { EASE_OUT, SPRING_MORPH } from '@/lib/motion'
import { hasCount, type RepoStats } from '@/lib/github-api'
import { OPEN_PROJECT_EVENT, PROJECT_PARAM, PROJECTS, type ProjectData } from '@/lib/projects'
import { ASK_ENABLED } from '@/lib/ask/protocol'
import { useMediaQuery } from '@/hooks/use-media-query'
import { Section } from '@/components/section'
import { useEffect, useRef, useState } from 'react'

// Shared-element morph between a project row and its details
const MORPH = SPRING_MORPH

// Details fade in after the morph is underway, and drop out quickly before
// it shrinks back into the row
const contentFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.25, delay: 0.12, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: EASE_OUT } },
} as const

interface Project extends ProjectData {
  stats: RepoStats | null
}

type Enlarge = (image: { src: string; alt: string }) => void

const NEW_TAB = { target: '_blank', rel: 'noopener noreferrer' } as const

// A screenshot with the site's 1px image edge, drawn on top so it follows
// the rounded corners, fading in over its placeholder instead of popping
function Shot({
  src,
  sizes,
  className = '',
  position = 'object-left-top',
}: {
  src: string
  sizes: string
  className?: string
  position?: string
}) {
  const [loaded, setLoaded] = useState(false)
  return (
    <span className={`relative block shrink-0 overflow-hidden bg-muted ${className}`}>
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        quality={95}
        onLoad={() => setLoaded(true)}
        className={`object-cover ${position} transition-opacity duration-200 ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
      <span aria-hidden className="image-outline pointer-events-none absolute inset-0 rounded-[inherit]" />
    </span>
  )
}

// The same text link the Ask cards use, so a project reads the same in both
function TextLink({
  href,
  children,
  internal = false,
  onClick,
}: {
  href: string
  children: React.ReactNode
  internal?: boolean
  onClick?: () => void
}) {
  return (
    <a
      href={href}
      {...(internal ? {} : NEW_TAB)}
      onClick={onClick}
      className="group touch-target relative inline-flex items-center gap-[3px] rounded-sm text-[13px] font-medium text-foreground"
    >
      <span className="underline underline-offset-[5px] decoration-muted-foreground/65 transition-colors group-hover:decoration-foreground">
        {children}
      </span>
      {!internal && (
        <ArrowUpRight
          className="size-[11px] shrink-0 text-muted-foreground/70 transition-[color,translate] duration-150 ease-out group-hover:text-foreground motion-safe:pointer-fine:group-hover:translate-x-px motion-safe:pointer-fine:group-hover:-translate-y-px"
          aria-hidden
        />
      )}
    </a>
  )
}

function projectLinks(project: Project) {
  return [
    project.links.demo && { href: project.links.demo, label: 'Website' },
    project.links.github && { href: project.links.github, label: 'Source' },
    project.links.paper && { href: project.links.paper, label: 'Paper' },
  ].filter(Boolean) as { href: string; label: string }[]
}

function Links({ project }: { project: Project }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1">
      {projectLinks(project).map((link) => (
        <TextLink
          key={link.href}
          href={link.href}
          onClick={() => track('Project link', { project: project.slug, link: link.label })}
        >
          {link.label}
        </TextLink>
      ))}
      {ASK_ENABLED && (
        <TextLink
          internal
          href={`/ask?q=${encodeURIComponent(`Tell me about ${project.title}`)}`}
          onClick={() => track('Project link', { project: project.slug, link: 'Ask' })}
        >
          Ask about it
        </TextLink>
      )}
    </div>
  )
}

// The panel's screenshot goes through next/image, so warming it means asking
// for the same srcset the panel will request
const PANEL_SHOT_SIZES = '(max-width: 640px) 100vw, 544px'
const warmed = new Set<string>()
function warmPanelShot(project: Project) {
  if (!project.image || warmed.has(project.image)) return
  warmed.add(project.image)
  const { props } = getImageProps({ src: project.image, alt: '', fill: true, sizes: PANEL_SHOT_SIZES, quality: 95 })
  const img = new window.Image()
  img.sizes = props.sizes ?? ''
  if (props.srcSet) img.srcset = props.srcSet
  img.src = props.src
}

// A handful of stars undersells a project, so small counts stay off
function notable(stats: RepoStats | null): stats is RepoStats {
  if (!stats || !hasCount(stats.stars)) return false
  return stats.stars.endsWith('k') || Number(stats.stars) >= 50
}

function Stars({ stats }: { stats: RepoStats | null }) {
  if (!notable(stats)) return null
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

function ShotButton({
  project,
  onEnlarge,
  className,
  sizes,
  style,
}: {
  project: Project
  onEnlarge: Enlarge
  className: string
  sizes: string
  style?: React.CSSProperties
}) {
  return (
    <button
      type="button"
      aria-label={`Open ${project.title} image preview`}
      onClick={() => onEnlarge({ src: project.image!, alt: project.title })}
      style={style}
      className={`group/image relative block w-full cursor-zoom-in outline-none ${className}`}
    >
      <Shot src={project.image!} sizes={sizes} className="h-full w-full rounded-[inherit]" />
      <span className="pointer-events-none absolute right-2.5 bottom-2.5 inline-flex size-7 items-center justify-center rounded-full bg-background/85 text-muted-foreground shadow-raised backdrop-blur-sm transition-opacity duration-150 ease-out opacity-0 group-hover/image:opacity-100 group-focus-visible/image:opacity-100 pointer-coarse:opacity-90">
        <Maximize2 className="size-3" />
      </span>
    </button>
  )
}

// The details use the Ask card's language: the screenshot inset with
// concentric corners, quiet type, and text links. Esc or a click outside
// closes it; the drawer on phones swipes away.

function InsetBody({
  project,
  title,
  Description,
  fade,
  onEnlarge,
}: {
  project: Project
  title: React.ReactNode
  Description: React.ElementType
  fade: boolean
  onEnlarge: Enlarge
}) {
  const Fade = fade ? motion.div : 'div'
  const fadeProps = fade ? contentFade : {}
  return (
    <>
      {project.image && (
        <Fade {...fadeProps} className="p-2.5">
          <ShotButton
            project={project}
            onEnlarge={onEnlarge}
            sizes={PANEL_SHOT_SIZES}
            className="aspect-[16/10] rounded-[18px]"
          />
        </Fade>
      )}
      <div className="px-7 pt-4 pb-7">
        {title}
        <Fade {...fadeProps}>
          <Description className="mt-2 text-[15px] leading-relaxed text-muted-foreground text-pretty">
            {project.fullDescription}
          </Description>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <Links project={project} />
            <Stars stats={project.stats} />
          </div>
        </Fade>
      </div>
    </>
  )
}

// Stars and forks come from the server (getProjectStats), cached there for
// ten minutes, so visitors' browsers never call GitHub themselves
export function Projects({ stats }: { stats: Record<string, RepoStats> }) {
  const [enlargedImage, setEnlargedImage] = useState<{
    src: string
    alt: string
  } | null>(null)
  const [enlargedImageOpen, setEnlargedImageOpen] = useState(false)
  const showImage = (image: { src: string; alt: string }) => {
    imageReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setEnlargedImage(image)
    setEnlargedImageOpen(true)
  }
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  // The row the panel morphed out of. Opening from a link or the palette, or
  // stepping to another project with the arrow keys, has no row to return
  // to, so the panel fades and scales instead (as the photo viewer does)
  const [originIndex, setOriginIndex] = useState<number | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 640px)')
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const imageReturnFocusRef = useRef<HTMLElement | null>(null)
  const enlargedOpenRef = useRef(false)
  enlargedOpenRef.current = enlargedImageOpen

  const desktopPanelOpen = detailsOpen && isDesktop
  const close = () => setDetailsOpen(false)

  // The morph panel replaces Radix Dialog on desktop, so dialog behavior
  // (Esc, focus trap, focus return, scroll lock) is handled here
  useEffect(() => {
    if (!desktopPanelOpen) return
    panelRef.current?.focus({ preventScroll: true })

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || enlargedOpenRef.current) return
      if (e.key === 'Escape') {
        // The image preview dialog stacks on top and handles its own Escape
        setDetailsOpen(false)
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        stepRef.current(e.key === 'ArrowRight' ? 1 : -1)
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

  // Warm the raw full-res URL for the enlarge dialog only once its project's
  // details are open; the inline screenshot loads resized through next/image
  useEffect(() => {
    if (!detailsOpen || activeIndex === null) return
    const image = projects[activeIndex]?.image
    if (image) {
      const img = new window.Image()
      img.src = image
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailsOpen, activeIndex])

  const projects: Project[] = PROJECTS.map((project) => ({
    ...project,
    stats: project.repo ? (stats[project.repo] ?? null) : null,
  }))

  const activeProject = activeIndex === null ? null : projects[activeIndex]

  const rowRefs = useRef<(HTMLButtonElement | null)[]>([])

  const show = (index: number, from: 'row' | 'link' | 'arrow') => {
    setActiveIndex(index)
    setOriginIndex(from === 'row' ? index : null)
    setDetailsOpen(true)
    // Focus goes back to whichever project is showing when the panel closes
    returnFocusRef.current = rowRefs.current[index] ?? returnFocusRef.current
    track('Project opened', { project: projects[index].slug, from })
  }

  const stepRef = useRef<(delta: number) => void>(() => {})
  stepRef.current = (delta) => {
    if (activeIndex === null) return
    show((activeIndex + delta + projects.length) % projects.length, 'arrow')
  }

  // Keep ?project= in the address bar while a project is open, so the page
  // can be shared or reloaded straight into it
  // Only removes a value it wrote itself, so an arriving ?project= survives
  // until the effect below has read it
  const wroteParamRef = useRef(false)
  useEffect(() => {
    const slug = detailsOpen && activeProject ? activeProject.slug : null
    if (!slug && !wroteParamRef.current) return
    const url = new URL(window.location.href)
    if (url.searchParams.get(PROJECT_PARAM) === slug) return
    if (slug) url.searchParams.set(PROJECT_PARAM, slug)
    else url.searchParams.delete(PROJECT_PARAM)
    wroteParamRef.current = Boolean(slug)
    window.history.replaceState(window.history.state, '', url)
  }, [detailsOpen, activeProject])

  // Open from ?project= on arrival, and from the command palette while here
  useEffect(() => {
    const openSlug = (slug: string | null) => {
      const index = projects.findIndex((project) => project.slug === slug)
      if (index !== -1) show(index, 'link')
    }
    openSlug(new URLSearchParams(window.location.search).get(PROJECT_PARAM))
    const onOpen = (event: Event) => openSlug((event as CustomEvent<string>).detail)
    window.addEventListener(OPEN_PROJECT_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_PROJECT_EVENT, onOpen)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <Section id="projects" label="Projects">
        <div className="flex flex-col gap-1">
          {projects.map((project, index) => (
            <button
              key={project.title}
              ref={(el) => {
                rowRefs.current[index] = el
              }}
              type="button"
              aria-haspopup="dialog"
              onPointerEnter={() => warmPanelShot(project)}
              onFocus={() => warmPanelShot(project)}
              onClick={() => show(index, 'row')}
              className="group relative -mx-2.5 w-[calc(100%+1.25rem)] cursor-pointer rounded-xl p-2.5 text-left outline-none transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-foreground/20 motion-safe:active:scale-[0.99]"
            >
              {/* Only this surface morphs into the panel. Text and the focus
                  ring stay outside the scaled layer so they never stretch. */}
              <motion.span
                layoutId={`project-card-${index}`}
                transition={MORPH}
                style={{ borderRadius: 12 }}
                aria-hidden
                className="absolute inset-0 bg-transparent transition-colors duration-150 ease-out pointer-fine:group-hover:bg-muted/60 group-active:bg-muted"
              />
              <span className="relative flex items-center gap-4">
                <span className="relative block h-12 w-[76px] shrink-0 overflow-hidden rounded-md sm:h-[54px] sm:w-[86px]">
                  {project.image && <Shot src={project.image} sizes="86px" className="h-full w-full rounded-[inherit]" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-snug">
                  <motion.span
                    layoutId={`project-title-${index}`}
                    transition={MORPH}
                    className="w-fit text-base font-medium text-foreground"
                  >
                    {project.title}
                  </motion.span>
                  <span className="text-[15px] text-muted-foreground text-pretty">{project.description}</span>
                </span>
                <ChevronRight
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground/50 transition-[color,translate] duration-150 ease-out group-hover:text-muted-foreground motion-safe:pointer-fine:group-hover:translate-x-0.5"
                />
              </span>
            </button>
          ))}
        </div>
      </Section>

      <AnimatePresence>
        {desktopPanelOpen && activeProject && activeIndex !== null && (
          <>
            <motion.div
              key="project-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              className="fixed inset-0 z-50 bg-scrim backdrop-blur-[12px] backdrop-saturate-[1.2] reduce-transparency:bg-black/40 reduce-transparency:backdrop-blur-none"
              onClick={close}
            />
              <div key="project-panel" className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-6">
                <motion.div
                  ref={panelRef}
                  role="dialog"
                  aria-modal="true"
                  aria-label={activeProject.title}
                  tabIndex={-1}
                  data-project-panel
                  initial={originIndex === null ? { opacity: 0, scale: 0.97 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={originIndex === null ? { opacity: 0, scale: 0.98, transition: { duration: 0.15, ease: EASE_OUT } } : undefined}
                  transition={{ duration: 0.25, ease: EASE_OUT }}
                  className="pointer-events-auto relative w-full max-w-[36rem] outline-none"
                >
                  <motion.div
                    layoutId={originIndex !== null ? `project-card-${originIndex}` : undefined}
                    transition={MORPH}
                    style={{ borderRadius: 28 }}
                    aria-hidden
                    className="absolute inset-0 bg-panel shadow-panel"
                  />
                  <div className="relative max-h-[88dvh] overflow-y-auto overscroll-contain rounded-[28px] custom-scrollbar">
                    {/* Stepping with the arrow keys remounts the contents, which
                        fade in quickly while the panel itself stays put. A
                        nested AnimatePresence here would stop the open and
                        close fades from reaching the contents. */}
                    <motion.div
                        key={activeIndex}
                        initial={originIndex === null ? { opacity: 0 } : false}
                        animate={{ opacity: 1, transition: { duration: 0.14, ease: EASE_OUT } }}
                      >
                        <InsetBody
                          project={activeProject}
                          fade={originIndex !== null}
                          Description="p"
                          onEnlarge={showImage}
                          title={
                            <motion.h2
                              layoutId={originIndex !== null ? `project-title-${originIndex}` : undefined}
                              transition={MORPH}
                              className="w-fit text-base font-medium text-foreground"
                            >
                              {activeProject.title}
                            </motion.h2>
                          }
                        />
                    </motion.div>
                  </div>
                </motion.div>
              </div>
          </>
        )}
      </AnimatePresence>

      <Drawer.Root open={detailsOpen && !isDesktop} onOpenChange={setDetailsOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="motion-drawer-overlay fixed inset-0 z-50 bg-scrim backdrop-blur-[12px] backdrop-saturate-[1.2] reduce-transparency:bg-black/40 reduce-transparency:backdrop-blur-none" />
          <Drawer.Content
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              returnFocusRef.current?.focus({ preventScroll: true })
            }}
            className="motion-drawer fixed inset-x-0 bottom-0 z-50 flex max-h-[94dvh] flex-col rounded-t-[28px] bg-panel shadow-panel outline-none"
          >
            <div aria-hidden className="mx-auto mt-2.5 mb-1 h-1 w-9 shrink-0 rounded-full bg-muted-foreground/25" />
            {activeProject && (
              <div className="overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
                <InsetBody
                  project={activeProject}
                  fade={false}
                  Description={Drawer.Description}
                  onEnlarge={showImage}
                  title={<Drawer.Title className="text-base font-medium text-foreground">{activeProject.title}</Drawer.Title>}
                />
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <Dialog
        open={enlargedImageOpen}
        // Keep the screenshot mounted through the dialog's exit animation.
        onOpenChange={setEnlargedImageOpen}
      >
        <DialogContent
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            imageReturnFocusRef.current?.focus({ preventScroll: true })
          }}
          className="max-w-[calc(100vw-1rem)] overflow-hidden p-0 sm:max-w-[calc(100vw-3rem)]"
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
            className="touch-target absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-full bg-background/80 backdrop-blur border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
          >
            <X className="size-3.5" />
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  )
}
