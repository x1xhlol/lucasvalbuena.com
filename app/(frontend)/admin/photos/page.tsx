'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ImageIcon, Trash2, Loader2 } from 'lucide-react'
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
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/photos')
        if (res.ok) {
          const data = await res.json()
          setPhotos(data)
        }
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleDeleteAll() {
    setDeletingAll(true)
    try {
      const res = await fetch('/api/photos', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete all')
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
    <main className="min-h-screen pt-24 pb-20">
      <Toaster />
      <div className="mx-auto max-w-7xl px-6 md:px-8 lg:px-12">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-12">
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/photos')}
              className="text-muted-foreground hover:text-foreground -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              View gallery
            </Button>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/20 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-foreground" />
                </span>
                <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
                  Admin
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Photo Management
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-14">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              <span className="text-sm font-mono tabular-nums">
                {photos.length}
              </span>
            </div>
            {photos.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteAllOpen(true)}
                className="text-red-600 border-red-600/30 hover:bg-red-600/10 hover:text-red-600 hover:border-red-600/50"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete all
              </Button>
            )}
          </div>
        </div>

        <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
          <DialogContent className="max-w-sm">
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
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deletingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete all'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Upload section */}
        <div className="mb-16">
          <PhotoUpload
            onUploaded={(photo) => setPhotos((prev) => [photo, ...prev])}
          />
        </div>

        {/* Photos grid */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Uploaded Photos
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground/60 rounded-full animate-spin" />
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
