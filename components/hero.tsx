'use client'

import { Github, Linkedin, Terminal } from 'lucide-react'
import type { SVGProps } from 'react'
import { motion } from 'framer-motion'

const OpenAIIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
)

const XIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

const ease = [0.22, 1, 0.36, 1] as const

type Stats = { stars: string; forks: string }

export function Hero({
  initialStats,
  repoStats,
}: {
  initialStats: Stats
  repoStats?: Stats
}) {
  const stats = initialStats
  const systemPrompts = repoStats ?? initialStats

  const parent = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.1 },
    },
  }

  const child = {
    hidden: { opacity: 0, y: 8, filter: 'blur(4px)' },
    show: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.5, ease },
    },
  }

  return (
    <section
      id="home"
      data-nosnippet=""
      className="relative pt-28 pb-10 md:pt-32 md:pb-14"
    >
      <div className="mx-auto max-w-5xl px-6 md:px-12 relative z-10">
        <div className="max-w-2xl mx-auto">
        <motion.div
          variants={parent}
          initial="hidden"
          animate="show"
          className="space-y-7 md:space-y-8"
        >
          <motion.h1
            variants={child}
            className="text-2xl md:text-[32px] font-semibold tracking-tight leading-[1.15]"
          >
            Lucas Valbuena
          </motion.h1>

          <motion.div variants={child} className="space-y-4">
            <p className="text-[15px] md:text-base text-foreground/90 leading-relaxed max-w-xl">
              I reverse-engineer AI tools and ship security research. 16, based
              in Spain.
            </p>
            <p className="text-[15px] md:text-base text-foreground/90 leading-relaxed max-w-xl">
              I run{' '}
              <a
                href="https://zeroleaks.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-[5px] decoration-muted-foreground/30 hover:decoration-foreground transition-colors"
              >
                ZeroLeaks
              </a>
              , a platform that stress-tests LLM apps for prompt injection and
              system-prompt extraction.
            </p>
            <p className="text-[15px] md:text-base text-foreground/90 leading-relaxed max-w-xl">
              I also maintain{' '}
              <a
                href="https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-[5px] decoration-muted-foreground/30 hover:decoration-foreground transition-colors"
              >
                system-prompts-and-models-of-ai-tools
              </a>
              {' '}({systemPrompts.stars} stars), a public archive of how the
              main AI tools guide their LLMs.
            </p>
          </motion.div>

          <motion.div variants={child} className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href="https://github.com/x1xhlol"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-3 py-1.5 rounded-md border border-border bg-background/60 font-mono text-[11px] hover:bg-muted/60 transition-colors duration-150"
            >
              <span className="flex items-center gap-1.5">
                <Terminal className="h-3 w-3 text-muted-foreground" />
                <span className="text-foreground">@x1xhlol</span>
              </span>
              <span className="text-muted-foreground">
                <span className="text-foreground">{stats.stars}</span> stars ·{' '}
                <span className="text-foreground">{stats.forks}</span> forks
              </span>
            </a>
            <a
              href="https://x.com/notlucknite/status/2012065359717708279"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background/60 text-[11px] hover:bg-muted/60 transition-colors duration-150"
            >
              <OpenAIIcon className="h-3 w-3 shrink-0" />
              <span className="text-muted-foreground">GPT-5 Security Research · OpenAI</span>
            </a>
          </motion.div>

          <motion.div variants={child} className="flex items-center gap-1 pt-1 -ml-2">
            <a
              href="https://github.com/x1xhlol"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150"
              aria-label="GitHub profile"
            >
              <Github className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <a
              href="https://x.com/NotLucknite"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150"
              aria-label="X profile"
            >
              <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <a
              href="https://linkedin.com/in/lucknite"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors duration-150"
              aria-label="LinkedIn profile"
            >
              <Linkedin className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </motion.div>
        </motion.div>
        </div>
      </div>
    </section>
  )
}
