import type { Metadata } from 'next'
import { getManifest } from '@/lib/photos'
import { PhotoGallery } from '@/components/photos/photo-gallery'
import { Navigation } from '@/components/navigation'
import { ScrollToTop } from '@/components/photos/scroll-to-top'

export const metadata: Metadata = {
  title: 'Photos | Lucas Valbuena',
  description: 'A collection of photographs by Lucas Valbuena.',
}

export const dynamic = 'force-dynamic'

export default async function PhotosPage() {
  const manifest = await getManifest()

  return (
    <>
      <ScrollToTop />
      <Navigation />
      <main className="min-h-screen pt-20 pb-12">
        <div className="mx-auto max-w-[1800px] px-3 sm:px-4 md:px-6">
          {manifest.photos.length === 0 ? (
            <div className="flex items-center justify-center py-32">
              <p className="text-muted-foreground font-mono text-sm">
                No photos yet.
              </p>
            </div>
          ) : (
            <PhotoGallery photos={manifest.photos} />
          )}
        </div>
      </main>
    </>
  )
}
