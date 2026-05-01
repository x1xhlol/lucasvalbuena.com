'use client'

import {
  Github,
  Star,
  GitFork,
  ArrowUpRight,
  Calendar,
  Shield,
  Code2,
  Globe,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { formatGithubThousands } from '@/lib/github-api'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

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

export function Projects() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [githubStats, setGithubStats] = useState<{ stars: string; forks: string } | null>(null)

  useEffect(() => {
    const fetchGitHubStats = async () => {
      try {
        const response = await fetch(
          'https://api.github.com/repos/x1xhlol/system-prompts-and-models-of-ai-tools',
          {
            headers: {
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          },
        )
        const data = (await response.json()) as {
          message?: string
          stargazers_count?: number
          forks_count?: number
        }

        if (!response.ok || typeof data.stargazers_count !== 'number') {
          setGithubStats({ stars: '—', forks: '—' })
          return
        }

        setGithubStats({
          stars: formatGithubThousands(data.stargazers_count),
          forks:
            typeof data.forks_count === 'number'
              ? formatGithubThousands(data.forks_count)
              : '—',
        })
      } catch (error) {
        console.error('Failed to fetch GitHub stats:', error)
        setGithubStats({ stars: '—', forks: '—' })
      }
    }

    fetchGitHubStats()
  }, [])

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

    projects.forEach((project) => {
      if (project.image) {
        const img = new Image()
        img.src = project.image
      }
    })

    return () => observer.disconnect()
  }, [])

  const projects: Project[] = [
    {
      title: 'System Prompts and Models of AI Tools',
      subtitle: 'AI Research / Open Source',
      description: 'Reverse-engineered system prompts from major AI coding assistants including v0, Cursor, and Windsurf.',
      fullDescription: 'This repository contains reverse-engineered system prompts from major AI coding assistants. I extract, document, and analyze the internal instructions that tools like v0, Cursor, Manus, and Windsurf use to guide their LLMs. The goal is transparency: developers can understand how these tools work and improve their own prompt engineering.',
      image: 'https://xobhe5j5syssmps0.public.blob.vercel-storage.com/Screenshot%202026-01-07%20152543.png',
      stats: githubStats,
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
      image: 'https://xobhe5j5syssmps0.public.blob.vercel-storage.com/Screenshot%202026-01-11%20190656.png',
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
      links: {
        github: 'https://github.com/x1xhlol/better-clawd',
      },
      icon: Code2,
    },
  ]

  return (
    <section
      id="projects"
      data-nosnippet=""
      className="relative pt-2 pb-10 md:pt-4 md:pb-12"
      ref={sectionRef}
    >
      <div className="mx-auto max-w-5xl px-6 md:px-12 relative z-10">
        <div className="max-w-2xl mx-auto space-y-6 md:space-y-7">
          <h2 className="text-sm md:text-base font-medium text-foreground animate-on-scroll">
            Projects
          </h2>

          <div className="flex flex-col">
            {projects.map((project, index) => (
              <Dialog key={index}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="group relative w-full text-left cursor-pointer animate-on-scroll py-2 -mx-2 px-2 rounded-md transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                    style={{ transitionDelay: `${index * 60}ms` }}
                  >
                    <div className="flex items-baseline gap-1.5 leading-snug">
                      <span className="text-sm font-medium text-foreground shrink-0">
                        {project.title}
                      </span>
                      <span className="text-sm text-muted-foreground line-clamp-1">
                        {project.description}
                      </span>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-auto self-center opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>
                </DialogTrigger>

                <DialogContent
                  showCloseButton={false}
                  className="max-w-xl p-0 gap-0 border border-border bg-background shadow-2xl rounded-xl overflow-hidden max-h-[88dvh] sm:max-h-[90vh] w-[calc(100%-1rem)] sm:w-full"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="relative flex flex-col max-h-[88dvh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar overscroll-contain"
                  >
                    <DialogClose
                      aria-label="Close"
                      className="sticky top-3 z-50 self-end mr-3 -mb-9 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                    >
                      <X className="h-3.5 w-3.5" />
                    </DialogClose>

                    {project.image && (
                      <div className="relative w-full bg-muted/30 border-b border-border shrink-0">
                        <div className="aspect-[16/9] sm:aspect-[16/10] w-full overflow-hidden">
                          <img
                            src={project.image}
                            alt={project.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const parent = e.currentTarget.parentElement
                              if (parent) {
                                parent.classList.add('flex', 'items-center', 'justify-center')
                                const span = document.createElement('span')
                                span.className = 'text-muted-foreground font-mono text-xs text-center px-6'
                                span.innerText = '[ image unavailable ]'
                                parent.appendChild(span)
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="p-5 sm:p-6 md:p-7 space-y-4 sm:space-y-5 flex flex-col">
                      <div className="space-y-1.5 sm:space-y-2">
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.18em]">
                          {project.subtitle}
                        </p>
                        <DialogTitle className="text-[17px] sm:text-lg md:text-xl font-semibold tracking-tight text-foreground pr-10 leading-snug">
                          {project.title}
                        </DialogTitle>
                      </div>

                      <DialogDescription className="text-[14px] sm:text-[15px] text-foreground/85 leading-relaxed">
                        {project.fullDescription}
                      </DialogDescription>

                      {project.stats && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Star className="h-3.5 w-3.5" />
                            <span className="font-medium font-mono tabular-nums text-foreground">
                              {project.stats.stars}
                            </span>
                            <span>stars</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <GitFork className="h-3.5 w-3.5" />
                            <span className="font-medium font-mono tabular-nums text-foreground">
                              {project.stats.forks}
                            </span>
                            <span>forks</span>
                          </span>
                        </div>
                      )}

                      {(project.links.demo || project.links.github) && (
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 border-t border-border">
                          {project.links.demo && (
                            <a
                              href={project.links.demo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground"
                            >
                              <Globe className="h-3.5 w-3.5" />
                              <span className="underline underline-offset-[5px] decoration-muted-foreground/30 group-hover:decoration-foreground transition-colors">
                                Website
                              </span>
                              <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                            </a>
                          )}
                          {project.links.github && (
                            <a
                              href={project.links.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground"
                            >
                              <Github className="h-3.5 w-3.5" />
                              <span className="underline underline-offset-[5px] decoration-muted-foreground/30 group-hover:decoration-foreground transition-colors">
                                Source
                              </span>
                              <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
