import { PROJECTS } from '@/lib/projects'
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

export type RepoStats = { stars: string; forks: string }

// Server only. Cached in Next's data cache for ten minutes; a missing number
// shows as a dash rather than failing the page.
export async function getRepoStats(repo: string): Promise<RepoStats> {
  try {
    const token = process.env.GITHUB_TOKEN

    const fetchRepo = async (useToken: boolean) =>
      fetch(`https://api.github.com/repos/${repo}`, {
        headers: githubRestHeaders(useToken && token ? token : undefined),
        next: { revalidate: 600 },
      })

    let response = await fetchRepo(true)
    if (response.status === 401 && token) {
      response = await fetchRepo(false)
    }

    if (!response.ok) return { stars: '—', forks: '—' }

    const data: { stargazers_count?: number; forks_count?: number } = await response.json()

    return {
      stars: typeof data.stargazers_count === 'number' ? formatGithubThousands(data.stargazers_count) : '—',
      forks: typeof data.forks_count === 'number' ? formatGithubThousands(data.forks_count) : '—',
    }
  } catch {
    return { stars: '—', forks: '—' }
  }
}

// Stars and forks for every project with a repo, keyed by repo
export async function getProjectStats(): Promise<Record<string, RepoStats>> {
  const repos = PROJECTS.flatMap((project) => (project.repo ? [project.repo] : []))
  return Object.fromEntries(await Promise.all(repos.map(async (repo) => [repo, await getRepoStats(repo)] as const)))
}

// False for a count GitHub didn't give us, so it can be left out
export const hasCount = (count: string | undefined) => Boolean(count) && count !== '—' && count !== '0'
