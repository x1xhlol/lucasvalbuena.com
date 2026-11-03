import type { Metadata } from 'next'
import { getManifest, type PhotoManifest } from '@/lib/photos'
import { PhotoGallery } from '@/components/photos/photo-gallery'
import { Navigation } from '@/components/navigation'
import { ScrollToTop } from '@/components/photos/scroll-to-top'

export const metadata: Metadata = {
  title: 'Photos | Lucas Valbuena',
  description: 'A collection of photographs by Lucas Valbuena.',
  alternates: {
    canonical: '/photos',
  },
}

// ISR: serve the gallery from cache and refresh the manifest in the background
export const revalidate = 60

export default async function PhotosPage() {
  let manifest: PhotoManifest = { photos: [] }
  let loadFailed = false
  try {
    manifest = await getManifest({ revalidate: 60 })
  } catch {
    loadFailed = true
  }

  return (
    <>
      <ScrollToTop />
      <Navigation />
      <main id="main-content" tabIndex={-1} className="min-h-screen pt-20 pb-12">
        <h1 className="sr-only">Photos</h1>
        <div className="mx-auto max-w-[1800px] px-3 sm:px-4 md:px-6">
          {manifest.photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-32">
              <p className="text-muted-foreground text-base">
                {loadFailed ? 'Photos could not be loaded.' : 'No photos published yet.'}
              </p>
              <a href={loadFailed ? '/photos' : '/'} className="inline-flex min-h-11 items-center text-sm text-foreground underline underline-offset-[5px] decoration-muted-foreground/65 hover:decoration-foreground">
                {loadFailed ? 'Try again' : 'Back to the portfolio'}
              </a>
            </div>
          ) : (
            <PhotoGallery photos={manifest.photos} />
          )}
        </div>
      </main>
    </>
  )
}
