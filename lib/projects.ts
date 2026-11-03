// Project copy shared by the home page list and the Ask agent's context, so
// the two never describe a project differently.
export interface ProjectData {
  // Stable id the Ask lock uses to show this project's card
  slug: string
  title: string
  // One line for the home page list
  description: string
  // The details panel text, also given to the Ask agent
  fullDescription: string
  image?: string
  // GitHub "owner/name" whose stars and forks the details panel shows
  repo?: string
  links: {
    github?: string
    demo?: string
    paper?: string
  }
}

export const PROJECTS: ProjectData[] = [
  {
    slug: 'system-prompts',
    title: 'System Prompts and Models of AI Tools',
    description: 'System prompts from 30+ AI tools, most of which I extracted myself.',
    fullDescription: 'AI coding tools like v0, Cursor, Manus, and Windsurf run on hidden instructions that decide how their models behave. I extracted most of the prompts in this repo myself and publish them so anyone can read them.',
    image: 'https://xobhe5j5syssmps0.public.blob.vercel-storage.com/Screenshot%202026-01-07%20152543.png',
    repo: 'x1xhlol/system-prompts-and-models-of-ai-tools',
    links: {
      github: 'https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools',
    },
  },
  {
    slug: 'zeroleaks',
    title: 'ZeroLeaks',
    description: 'Red-teams AI agents through their tools and memory on every change.',
    fullDescription: "I built ZeroLeaks to attack AI agents the way a real attacker would. It works out what an agent must never do, then goes after those limits through its tools, memory, and the other agents it talks to, every time the agent changes. Every finding comes with the policy or config change that fixes it. The system-prompt scanner is open source.",
    image: '/projects/zeroleaks-2026.png',
    links: {
      github: 'https://github.com/ZeroLeaks/zeroleaks',
      demo: 'https://zeroleaks.ai',
    },
  },
  {
    slug: 'pare',
    title: 'Pare',
    description: "Halves a video in the browser tab. I rewrote x264's assembly in Wasm SIMD.",
    fullDescription: "Pare compresses video in the browser tab, so the file never leaves your computer. I rewrote about 1,500 lines of x264's assembly in WebAssembly SIMD, and the output is byte-identical to the C build. I chose every encoder setting by measuring VMAF on a test corpus.",
    image: '/projects/pare.jpg',
    repo: 'x1xhlol/pare',
    links: {
      github: 'https://github.com/x1xhlol/pare',
      demo: 'https://pare-eight.vercel.app',
    },
  },
  {
    slug: 'zero-calendar',
    title: 'Zero Calendar',
    description: 'An open-source calendar that turns a plain sentence into an event.',
    fullDescription: 'In Zero Calendar you add an event by typing "lunch with Alex next Tuesday at noon" instead of clicking through date pickers. It syncs with Google Calendar and handles recurring events.',
    image: '/projects/zero-calendar.png',
    repo: 'x1xhlol/zero-calendar',
    links: {
      github: 'https://github.com/x1xhlol/zero-calendar',
    },
  },
  {
    slug: 'better-clawd',
    title: 'Better-Clawd',
    description: 'A Claude Code fork with no telemetry and a choice of model providers.',
    fullDescription: "I forked Claude Code to keep its CLI and drop the telemetry. It runs against OpenAI, OpenRouter, or Anthropic, so you aren't tied to one provider.",
    image: '/projects/better-clawd-terminal.png',
    repo: 'x1xhlol/better-clawd',
    links: {
      github: 'https://github.com/x1xhlol/better-clawd',
    },
  },
]
