import { getPosts } from '@/lib/ask/context'
import type { AskCardData } from '@/lib/ask/cards'
import { getProjectStats } from '@/lib/github-api'
import { getManifest } from '@/lib/photos'

const PHOTOS_SHOWN = 4

async function getPhotos(): Promise<AskCardData['photos']> {
  try {
    const { photos } = await getManifest({ revalidate: 60 })
    return {
      total: photos.length,
      latest: photos.slice(0, PHOTOS_SHOWN).map(({ url, width, height }) => ({ url, width, height })),
    }
  } catch {
    return { total: 0, latest: [] }
  }
}

// Never rejects: stats fall back to dashes and posts and photos to empty
// lists, and a card without them still renders
export async function getAskCardData(): Promise<AskCardData> {
  const [stats, posts, photos] = await Promise.all([getProjectStats(), getPosts(), getPhotos()])
  return {
    stats,
    posts: posts.map(({ title, slug, publishedAt }) => ({ title, slug, publishedAt })),
    photos,
  }
}
