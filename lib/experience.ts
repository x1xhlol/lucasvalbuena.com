export interface ExperienceItem {
  company: 'Orchid' | 'ZeroLeaks'
  role: string
  href: string
  dates: string
}

export const EXPERIENCE: ExperienceItem[] = [
  {
    company: 'Orchid',
    role: 'AI Agent & Product Intern',
    href: 'https://orchid.ai',
    dates: 'Jul 2026 – Oct 2026',
  },
  {
    company: 'ZeroLeaks',
    role: 'Founder',
    href: 'https://zeroleaks.ai',
    dates: 'Mar 2025 – Present',
  },
]
