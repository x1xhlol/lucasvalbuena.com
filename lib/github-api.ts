import { siteConfig } from '@/lib/site'

export function githubRestHeaders(token?: string): HeadersInit {
  const base: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': `LucasValbuena-Portfolio/1.0 (+${siteConfig.url})`,
  }
  if (token) base.Authorization = `Bearer ${token}`
  return base
}

export function formatGithubThousands(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}
