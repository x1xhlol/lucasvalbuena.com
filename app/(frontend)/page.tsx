import { Suspense } from 'react'
import { Hero } from '@/components/hero'
import { Projects } from '@/components/projects'
import { Skills } from '@/components/skills'
import { Stack } from '@/components/stack'
import { Contact } from '@/components/contact'
import { Navigation } from '@/components/navigation'
import { BlogSection } from '@/components/blog-section'
import type { BlogPost } from '@/components/blog-section'
import { getPayloadClient } from '@/lib/payload'
import { formatGithubThousands, githubRestHeaders } from '@/lib/github-api'
import { siteConfig } from '@/lib/site'
import { unstable_noStore as noStore } from 'next/cache'

type PayloadBlogPost = {
  id: string
  title: string
  slug: string
  excerpt: string
  publishedAt: string
  tags?: { tag: string }[]
}

async function getGithubStats() {
  try {
    const token = process.env.GITHUB_TOKEN
    const user = siteConfig.githubUser

    let totalStars = 0
    let totalForks = 0

    const fetchReposPage = async (page: number, useToken: boolean) => {
      const url = `https://api.github.com/users/${user}/repos?per_page=100&page=${page}&type=owner`
      return fetch(url, {
        headers: githubRestHeaders(useToken && token ? token : undefined),
        next: { revalidate: 600 },
      })
    }

    for (let page = 1; page <= 50; page++) {
      let response = await fetchReposPage(page, true)

      if (response.status === 401 && token) {
        response = await fetchReposPage(page, false)
      }

      if (!response.ok) break

      const repos: { stargazers_count: number; forks_count: number; fork: boolean }[] =
        await response.json()
      if (!Array.isArray(repos) || repos.length === 0) break

      for (const repo of repos) {
        if (repo.fork) continue
        totalStars += repo.stargazers_count ?? 0
        totalForks += repo.forks_count ?? 0
      }

      if (repos.length < 100) break
    }

    if (totalStars === 0) {
      return { stars: '—', forks: '—' }
    }

    return {
      stars: formatGithubThousands(totalStars),
      forks: formatGithubThousands(totalForks),
    }
  } catch {
    return { stars: '—', forks: '—' }
  }
}

async function getRepoStats(slug: string) {
  try {
    const token = process.env.GITHUB_TOKEN

    const fetchRepo = async (useToken: boolean) =>
      fetch(`https://api.github.com/repos/${slug}`, {
        headers: githubRestHeaders(useToken && token ? token : undefined),
        next: { revalidate: 600 },
      })

    let response = await fetchRepo(true)
    if (response.status === 401 && token) {
      response = await fetchRepo(false)
    }

    if (!response.ok) return { stars: '—', forks: '—' }

    const repo: { stargazers_count?: number; forks_count?: number } = await response.json()

    const stars = repo.stargazers_count
    const forks = repo.forks_count

    return {
      stars: typeof stars === 'number' ? formatGithubThousands(stars) : '—',
      forks: typeof forks === 'number' ? formatGithubThousands(forks) : '—',
    }
  } catch {
    return { stars: '—', forks: '—' }
  }
}

async function HeroWithStats() {
  const [githubStats, systemPromptsStats] = await Promise.all([
    getGithubStats(),
    getRepoStats('x1xhlol/system-prompts-and-models-of-ai-tools'),
  ])
  return <Hero initialStats={githubStats} repoStats={systemPromptsStats} />
}

async function LatestPosts() {
  noStore()

  try {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'posts',
      where: {
        status: { equals: 'published' },
      },
      sort: '-publishedAt',
      limit: 5,
    })

    const posts: BlogPost[] = (docs as PayloadBlogPost[]).map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      publishedAt: post.publishedAt,
      tags: post.tags,
    }))

    return <BlogSection posts={posts} />
  } catch {
    return <BlogSection posts={[]} />
  }
}

export default function Page() {
  return (
    <div className="relative min-h-screen">
      <Navigation />
      <main>
        <Suspense fallback={<div className="h-screen" />}>
          <HeroWithStats />
        </Suspense>
        <Projects />
        <Skills />
        <Stack />
        <Suspense fallback={<div className="py-16" />}>
          <LatestPosts />
        </Suspense>
        <Contact />
      </main>
    </div>
  )
}
