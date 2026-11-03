'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, CircleAlert, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PhotoUpload } from '@/components/admin/photo-upload'
import { PhotoManager } from '@/components/admin/photo-manager'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import type { Photo } from '@/lib/photos'

export default function AdminPhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const deleteAllTriggerRef = useRef<HTMLButtonElement>(null)
  const loadPhotos = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await fetch('/api/photos', { signal })
      if (!res.ok) throw new Error('Photos could not be loaded')
      const photos: Photo[] = await res.json()
      setPhotos(photos)
    } catch {
      if (!signal?.aborted) setLoadError('Could not load your photos. Check your connection and try again.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadPhotos(controller.signal)
    return () => controller.abort()
  }, [loadPhotos])

  async function handleDeleteAll() {
    if (deletingAll) return
    setDeletingAll(true)
    try {
      const res = await fetch('/api/photos', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Could not delete the photos. Try again.')
        return
      }
      setPhotos([])
      setDeleteAllOpen(false)
      toast.success('All photos deleted')
    } catch {
      toast.error('Failed to delete all photos')
    } finally {
      setDeletingAll(false)
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen pt-12 pb-20 sm:pt-24">
      <Toaster />
      <div className="mx-auto max-w-7xl px-6 md:px-8 lg:px-12">
        <div className="flex flex-col items-start justify-between gap-6 mb-10 sm:flex-row sm:items-end">
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-muted-foreground hover:text-foreground -ml-2"
            >
              <Link href="/photos">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                View gallery
              </Link>
            </Button>
            <div className="space-y-1">
              <h1 className="text-2xl font-medium tracking-tight text-foreground">
                Manage photos
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <p className="min-w-20 text-sm text-muted-foreground tabular-nums">
              {loading ? 'Loading…' : loadError ? 'Unavailable' : `${photos.length} photo${photos.length === 1 ? '' : 's'}`}
            </p>
            {!loading && !loadError && photos.length > 0 && (
              <Button
                ref={deleteAllTriggerRef}
                variant="outline"
                size="sm"
                onClick={() => setDeleteAllOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete all
              </Button>
            )}
          </div>
        </div>

        <Dialog open={deleteAllOpen} onOpenChange={(open) => { if (!deletingAll) setDeleteAllOpen(open) }}>
          <DialogContent
            className="max-w-sm"
            showCloseButton={!deletingAll}
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              const target = deleteAllTriggerRef.current ?? document.getElementById('main-content')
              target?.focus({ preventScroll: true })
            }}
          >
            <DialogHeader>
              <DialogTitle>Delete all photos</DialogTitle>
              <DialogDescription>
                This will permanently remove all {photos.length} photo
                {photos.length !== 1 ? 's' : ''} from storage. This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="ghost"
                onClick={() => setDeleteAllOpen(false)}
                disabled={deletingAll}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAll}
                disabled={deletingAll}
              >
                {deletingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin motion-reduce:animate-none" />
                    Deleting…
                  </>
                ) : (
                  'Delete all'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="mb-16">
          <PhotoUpload
            onUploaded={(photo) => setPhotos((prev) => [photo, ...prev])}
          />
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Uploaded photos
          </h2>

          {loading ? (
            <div role="status" className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />
              Loading photos…
            </div>
          ) : loadError ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
              <p role="alert" className="flex max-w-sm items-start gap-2 text-sm text-destructive">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {loadError}
              </p>
              <Button variant="outline" onClick={() => void loadPhotos()}>Try again</Button>
            </div>
          ) : (
            <PhotoManager
              photos={photos}
              onDeleted={(id) =>
                setPhotos((prev) => prev.filter((p) => p.id !== id))
              }
              onUpdated={(updated) =>
                setPhotos((prev) =>
                  prev.map((p) => (p.id === updated.id ? updated : p))
                )
              }
            />
          )}
        </div>
      </div>
    </main>
  )
}
