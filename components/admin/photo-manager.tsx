'use client'

import { useRef, useState } from 'react'
import { CircleAlert, Trash2, Loader2, MapPin } from 'lucide-react'
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
  const [locationError, setLocationError] = useState('')
  const [visibleCount, setVisibleCount] = useState(30)
  const actionTriggerRef = useRef<HTMLButtonElement | null>(null)
  const locationTitleRef = useRef<HTMLHeadingElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  function restoreFocus(event: Event) {
    event.preventDefault()
    const trigger = actionTriggerRef.current
    if (trigger?.isConnected && !trigger.disabled) trigger.focus({ preventScroll: true })
    else (gridRef.current ?? document.getElementById('main-content'))?.focus({ preventScroll: true })
  }

  async function handleDelete(id: string) {
    if (deletingId) return
    setDeletingId(id)

    try {
      const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to delete')
        return
      }
      onDeleted(id)
      setConfirmId(null)
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
    setLocationError('')
  }

  async function handleSaveLocation(event: React.FormEvent) {
    event.preventDefault()
    if (!locationPhoto || savingLocation) return
    setLocationError('')
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
        setLocationError(
          res.status === 422
            ? 'No place found at those coordinates. Type the place name instead.'
            : 'Could not save the location. Try again.',
        )
        return
      }
      const updated = (await res.json()) as Photo
      onUpdated?.(updated)
      setLocationPhoto(null)
      toast.success('Location updated')
    } catch {
      setLocationError('Could not connect. Your changes are still here; try again.')
    } finally {
      setSavingLocation(false)
    }
  }

  if (photos.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-center">
        <p className="text-foreground text-base">Your gallery is empty.</p>
        <p className="text-muted-foreground text-sm">
          Choose photos above to publish your first images.
        </p>
      </div>
    )
  }

  return (
    <>
      <div ref={gridRef} tabIndex={-1} role="group" aria-label="Uploaded photos" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {photos.slice(0, visibleCount).map((photo, index) => (
          <div
            key={photo.id}
            className="relative rounded-lg bg-muted"
          >
            <img
              src={photo.url}
              alt=""
              width={photo.width || 1600}
              height={photo.height || 1200}
              loading="lazy"
              className="image-outline aspect-square w-full rounded-lg object-cover"
            />

            <div className="absolute inset-x-1 top-1 flex justify-between gap-1">
              <button
                type="button"
                onClick={(e) => {
                  actionTriggerRef.current = e.currentTarget
                  openLocationEdit(photo)
                }}
                className="inline-flex size-11 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/85 transition-[background-color,scale] duration-150 motion-safe:active:scale-[0.97]"
                aria-label={`${photo.metadata.location ? 'Edit' : 'Add'} location for photo ${index + 1}`}
                title={photo.metadata.location ? 'Edit location' : 'Add location'}
              >
                <MapPin className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Delete photo ${index + 1}`}
                onClick={(e) => {
                  actionTriggerRef.current = e.currentTarget
                  setConfirmId(photo.id)
                }}
                disabled={deletingId === photo.id}
                className="inline-flex size-11 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/85 transition-[background-color,scale] duration-150 motion-safe:active:scale-[0.97] disabled:cursor-wait"
              >
                {deletingId === photo.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
      {visibleCount < photos.length && (
        <Button variant="outline" onClick={() => setVisibleCount((count) => count + 30)}>Show more photos</Button>
      )}

      <Dialog open={!!confirmId} onOpenChange={(open) => { if (!open && !deletingId) setConfirmId(null) }}>
        <DialogContent className="max-w-sm" onCloseAutoFocus={restoreFocus} showCloseButton={!deletingId}>
          <DialogHeader>
            <DialogTitle>Delete photo</DialogTitle>
            <DialogDescription>
              This will permanently remove the photo. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setConfirmId(null)} disabled={!!deletingId}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmId && handleDelete(confirmId)}
              disabled={!!deletingId}
            >
              {deletingId ? 'Deleting…' : 'Delete photo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!locationPhoto}
        onOpenChange={(open) => { if (!open && !savingLocation) setLocationPhoto(null) }}
      >
        <DialogContent
          className="max-w-sm"
          onCloseAutoFocus={restoreFocus}
          showCloseButton={!savingLocation}
          onOpenAutoFocus={(event) => {
            if (window.matchMedia('(pointer: coarse)').matches) {
              event.preventDefault()
              locationTitleRef.current?.focus()
            }
          }}
        >
          <DialogHeader>
            <DialogTitle ref={locationTitleRef} tabIndex={-1}>Photo location</DialogTitle>
            <DialogDescription>
              Enter a place name. Coordinates work too and are saved as the place they point to. Leave it blank to remove the location.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveLocation} aria-busy={savingLocation} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="photo-location" className="block text-sm font-medium">Location</label>
              <Input
                id="photo-location"
                autoComplete="off"
                placeholder="e.g. London, United Kingdom"
                value={locationValue}
                disabled={savingLocation}
                aria-invalid={!!locationError}
                aria-describedby={locationError ? 'location-error' : undefined}
                onChange={(e) => {
                  setLocationValue(e.target.value)
                  setLocationError('')
                }}
              />
              {locationError && (
                <p id="location-error" role="alert" className="flex items-start gap-2 text-sm text-destructive">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {locationError}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setLocationPhoto(null)}
                disabled={savingLocation}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingLocation}
              >
                {savingLocation ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin motion-reduce:animate-none" />
                    Saving…
                  </>
                ) : (
                  'Save location'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
