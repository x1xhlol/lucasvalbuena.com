'use client'

import { Star, GitFork, ArrowUpRight, Maximize2, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import Image from 'next/image'
import { Drawer } from 'vaul'
import { AnimatePresence, motion } from 'motion/react'
import { EASE_OUT, SPRING_MORPH } from '@/lib/motion'
import { hasCount, type RepoStats } from '@/lib/github-api'
import { PROJECTS, type ProjectData } from '@/lib/projects'
import { useMediaQuery } from '@/hooks/use-media-query'
import { Section } from '@/components/section'
import { useEffect, useRef, useState } from 'react'

// Shared-element morph between a project row and its details panel
const MORPH = SPRING_MORPH

// Panel content fades in after the card morph is underway, and drops out
// quickly before the card shrinks back into the row
const contentFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, delay: 0.1, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: EASE_OUT } },
} as const

interface Project extends ProjectData {
  stats: RepoStats | null
}

function ProjectLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex min-h-11 items-center gap-[3px] text-[13px] font-medium text-foreground rounded-sm"
    >
      <span className="underline underline-offset-[5px] decoration-muted-foreground/65 group-hover:decoration-foreground transition-colors">
        {children}
      </span>
      <ArrowUpRight
        className="h-[11px] w-[11px] shrink-0 text-muted-foreground/70 transition-[color,transform,translate,scale] duration-150 ease-out group-hover:text-foreground motion-safe:pointer-fine:group-hover:translate-x-[1px] motion-safe:pointer-fine:group-hover:-translate-y-[1px]"
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
    <span className="relative block h-full w-full">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, 576px"
        quality={95}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={`object-contain transition-opacity duration-200 ease-out ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </span>
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
      {project.links.paper && (
        <ProjectLink href={project.links.paper}>Paper</ProjectLink>
      )}
      {project.stats && hasCount(project.stats.stars) && (
        <div className="flex items-center gap-3.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3" aria-hidden />
            <span className="tabular-nums">{project.stats.stars}</span>
            <span className="sr-only">stars</span>
          </span>
          {hasCount(project.stats.forks) && (
            <span className="inline-flex items-center gap-1">
              <GitFork className="h-3 w-3" aria-hidden />
              <span className="tabular-nums">{project.stats.forks}</span>
              <span className="sr-only">forks</span>
            </span>
          )}
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
        <Title className="text-[17px] sm:text-lg font-semibold tracking-tight leading-snug text-foreground">
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
  const [detailsOpen, setDetailsOpen] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 640px)')
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const imageReturnFocusRef = useRef<HTMLElement | null>(null)
  const enlargedOpenRef = useRef(false)
  enlargedOpenRef.current = enlargedImageOpen

  const desktopPanelOpen = detailsOpen && isDesktop

  // The morph panel replaces Radix Dialog on desktop, so dialog behavior
  // (Esc, focus trap, focus return, scroll lock) is handled here
  useEffect(() => {
    if (!desktopPanelOpen) return
    returnFocusRef.current = document.activeElement as HTMLElement | null
    panelRef.current?.focus({ preventScroll: true })

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || enlargedOpenRef.current) return
      if (e.key === 'Escape') {
        // The image preview dialog stacks on top and handles its own Escape
        setDetailsOpen(false)
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

  return (
    <>
      <Section id="projects" label="Projects">
        <div className="flex flex-col gap-2">
          {projects.map((project, index) => (
            <motion.button
              key={project.title}
              layoutId={`project-card-${index}`}
              transition={MORPH}
              style={{ borderRadius: 8 }}
              type="button"
              aria-haspopup="dialog"
              onClick={(event) => {
                returnFocusRef.current = event.currentTarget
                setActiveIndex(index)
                setDetailsOpen(true)
              }}
              className="group relative w-full text-left cursor-pointer py-2 -mx-2 px-2 rounded-md transition-colors duration-150 hover:bg-muted/40 active:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
            >
              <div className="flex min-w-0 flex-col gap-0.5 leading-snug">
                <motion.span
                  layoutId={`project-title-${index}`}
                  transition={MORPH}
                  className="w-fit text-base font-medium text-foreground"
                >
                  {project.title}
                </motion.span>
                <span className="text-base text-muted-foreground text-pretty">
                  {project.description}
                </span>
              </div>
            </motion.button>
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
                  <motion.h2
                    layoutId={`project-title-${activeIndex}`}
                    transition={MORPH}
                    className="w-fit text-[17px] font-semibold tracking-tight leading-snug text-foreground"
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
                          showImage({
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
                  className="touch-target absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground backdrop-blur transition-colors duration-150 hover:bg-muted/80 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
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
          <Drawer.Overlay className="motion-drawer-overlay fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]" />
          <Drawer.Content
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              returnFocusRef.current?.focus({ preventScroll: true })
            }}
            className="motion-drawer fixed inset-x-0 bottom-0 z-50 flex max-h-[94dvh] flex-col rounded-t-[20px] border-t border-border bg-background outline-none"
          >
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
                  onEnlarge={showImage}
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
