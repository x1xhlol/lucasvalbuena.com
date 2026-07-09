'use client'

import { useState } from 'react'
import { Trash2, Loader2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Photo } from '@/lib/photos'

interface PhotoManagerProps {
  photos: Photo[]
  onDeleted: (id: string) => void
  onUpdated?: (photo: Photo) => void
}

export function PhotoManager({ photos, onDeleted, onUpdated }: PhotoManagerProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [locationPhoto, setLocationPhoto] = useState<Photo | null>(null)
  const [locationValue, setLocationValue] = useState('')
  const [savingLocation, setSavingLocation] = useState(false)

  async function handleDelete(id: string) {
    setConfirmId(null)
    setDeletingId(id)

    try {
      const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete')
        return
      }
      onDeleted(id)
      toast.success('Photo deleted')
    } catch {
      toast.error('Failed to delete photo')
    } finally {
      setDeletingId(null)
    }
  }

  function openLocationEdit(photo: Photo) {
    setLocationPhoto(photo)
    setLocationValue(photo.metadata.location ?? '')
  }

  async function handleSaveLocation() {
    if (!locationPhoto) return
    setSavingLocation(true)
    try {
      const res = await fetch(`/api/photos/${locationPhoto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: { location: locationValue.trim() || null },
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to update')
        return
      }
      const updated = (await res.json()) as Photo
      onUpdated?.(updated)
      setLocationPhoto(null)
      toast.success('Location updated')
    } catch {
      toast.error('Failed to update location')
    } finally {
      setSavingLocation(false)
    }
  }

  if (photos.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground font-mono text-sm">
          No photos uploaded yet.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative group rounded-lg overflow-hidden border border-border bg-muted/10"
          >
            <img
              src={photo.url}
              alt=""
              loading="lazy"
              className="w-full h-auto block"
            />

            {/* Hover overlay with location + delete */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  openLocationEdit(photo)
                }}
                className="absolute top-2 left-2 p-1.5 rounded-full bg-black/60 text-white/80 hover:bg-white/20 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                title={photo.metadata.location ? 'Edit location' : 'Add location'}
              >
                <MapPin className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setConfirmId(photo.id)}
                disabled={deletingId === photo.id}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white/80 hover:bg-red-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {deletingId === photo.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!confirmId} onOpenChange={() => setConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete photo</DialogTitle>
            <DialogDescription>
              This will permanently remove the photo. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmId && handleDelete(confirmId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location edit dialog */}
      <Dialog
        open={!!locationPhoto}
        onOpenChange={(open) => !open && setLocationPhoto(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Location</DialogTitle>
            <DialogDescription>
              Add or override the location for this photo. You can enter a city
              name (e.g. London, UK) or coordinates.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="e.g. London, United Kingdom"
            value={locationValue}
            onChange={(e) => setLocationValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveLocation()}
            className="mt-2"
          />
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="ghost"
              onClick={() => setLocationPhoto(null)}
              disabled={savingLocation}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveLocation}
              disabled={savingLocation}
            >
              {savingLocation ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
