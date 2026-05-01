'use client'

import { useRef } from 'react'
import { ScrollReveal } from './ui/scroll-reveal'

export function About() {
  const sectionRef = useRef<HTMLDivElement>(null)

  return (
    <section id="about" className="relative pt-4 pb-16 md:pt-6 md:pb-20" ref={sectionRef}>
      <div className="mx-auto max-w-3xl px-6 md:px-8 relative z-10">
        <div className="space-y-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-border bg-muted/30">
              <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
              <span className="text-[11px] font-mono font-medium">About</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              A bit about me
            </h2>
          </div>

          <div className="space-y-6">
            <ScrollReveal
              size="sm"
              variant="default"
              enableBlur={true}
              blurStrength={4}
              staggerDelay={0.02}
              baseOpacity={0.1}
              baseRotation={0}
              threshold={0.3}
            >
              I started coding because I was curious about how AI tools actually work. I wanted to understand what happens between a prompt and the code you get back. That curiosity pulled me into digging through prompts, testing behaviors, and building a few tools of my own.
            </ScrollReveal>

            <ScrollReveal
              size="sm"
              variant="muted"
              enableBlur={true}
              blurStrength={4}
              staggerDelay={0.02}
              baseOpacity={0.1}
              baseRotation={0}
              threshold={0.3}
            >
              My main project, system-prompts-and-models-of-ai-tools, documents the internal prompts behind tools like Cursor, v0, Windsurf, and Manus. I collect and share how these assistants are guided. The repo has grown to over 100k stars, and it's been great to see how many developers are interested in what's happening under the hood.
            </ScrollReveal>

            <ScrollReveal
              size="sm"
              variant="muted"
              enableBlur={true}
              blurStrength={4}
              staggerDelay={0.02}
              baseOpacity={0.1}
              baseRotation={0}
              threshold={0.3}
            >
              Beyond the prompts repo, I try to ship useful open-source tools. ZeroLeaks tests LLM apps with prompt injection attacks to see if they're vulnerable. Zero Calendar turns natural language into events without the date-picker dance. I learn by building and breaking things, and I like working on problems that matter.
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  )
}
