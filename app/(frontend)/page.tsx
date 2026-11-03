import { Suspense } from 'react'
import { Hero } from '@/components/hero'
import { Experience } from '@/components/experience'
import { Projects } from '@/components/projects'
import { Contact } from '@/components/contact'
import { Navigation } from '@/components/navigation'
import { SideNav } from '@/components/side-nav'
import { BlogSection } from '@/components/blog-section'
import { AskBanner } from '@/components/ask-banner'
import { ASK_ENABLED } from '@/lib/ask/protocol'
import type { BlogPost } from '@/components/blog-section'
import { getPayloadClient } from '@/lib/payload'
import { getProjectStats } from '@/lib/github-api'

// ISR: serve the page from cache; posts and stats refresh in the background
export const revalidate = 60

async function LatestPosts() {

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

    const posts: BlogPost[] = docs.map((post) => ({
      id: String(post.id),
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      publishedAt: post.publishedAt ?? '',
      tags: post.tags ?? undefined,
    }))

    return <BlogSection posts={posts} />
  } catch {
    return <BlogSection posts={[]} />
  }
}

export default async function Page() {
  // Resolved here (ISR-cached) instead of behind a Suspense boundary: a
  // suspended hero flashes the blank fallback and replays its entrance
  // whenever the stats fetch is in flight during revalidation
  const stats = await getProjectStats()
  return (
    // With the Ask band, the gray runs on behind the page and the page sits
    // on it like a sheet, its top corners rounded where the band ends
    <div className={`relative min-h-screen ${ASK_ENABLED ? 'bg-muted' : ''}`}>
      <Navigation isHome hasBanner={ASK_ENABLED} />
      <SideNav />
      {ASK_ENABLED && <AskBanner />}
      <main
        id="main-content"
        tabIndex={-1}
        className={ASK_ENABLED ? 'rounded-t-[28px] bg-background md:rounded-t-[44px]' : undefined}
      >
        <Hero stats={stats['x1xhlol/system-prompts-and-models-of-ai-tools']} />
        <Experience />
        <Projects stats={stats} />
        <Suspense fallback={null}>
          <LatestPosts />
        </Suspense>
        <Contact />
      </main>
    </div>
  )
}
