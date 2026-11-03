'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import type { Photo } from '@/lib/photos'
import { PhotoLightbox } from './photo-lightbox'
import { SPRING_MORPH } from '@/lib/motion'

interface PhotoGalleryProps {
  photos: Photo[]
}

interface PositionedItem {
  originalIndex: number
  top: number
  left: number
}

const LIGHTBOX_PREFETCH_QUALITY = 100
const NEXT_IMAGE_WIDTHS = [640, 750, 828, 1080, 1200, 1920, 2048, 3840] as const

function hasPhotoMetadata(photo: Photo): boolean {
  return Object.values(photo.metadata).some((value) => value !== undefined && value !== null && value !== '')
}

function closestNextImageWidth(target: number): number {
  return NEXT_IMAGE_WIDTHS.find((size) => size >= target) ?? NEXT_IMAGE_WIDTHS[NEXT_IMAGE_WIDTHS.length - 1]
}

function buildNextImageUrl(url: string, width: number, quality: number): string {
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  // The lightbox morphs from/to the tile it opened on; once the visitor
  // navigates to another photo the shared element is gone and it fades instead
  const [morphPhotoId, setMorphPhotoId] = useState<string | null>(null)
  const galleryRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef(new Map<string, HTMLButtonElement>())
  const rafRef = useRef<number | null>(null)
  const prefetchedPhotoIdsRef = useRef(new Set<string>())
  const [visualOrder, setVisualOrder] = useState<number[]>(
    photos.map((_, index) => index),
  )

  const measureVisualOrder = useCallback(() => {
    const positioned: PositionedItem[] = []

    photos.forEach((photo, originalIndex) => {
      const el = itemRefs.current.get(photo.id)
      if (!el) return

      const rect = el.getBoundingClientRect()
      positioned.push({
        originalIndex,
        top: Math.round(rect.top),
        left: Math.round(rect.left),
      })
    })

    if (positioned.length !== photos.length) return

    positioned.sort((a, b) => {
      const topDiff = a.top - b.top
      return Math.abs(topDiff) <= 2 ? a.left - b.left : topDiff
    })

    const nextOrder = positioned.map((item) => item.originalIndex)
    setVisualOrder((prev) => {
      if (
        prev.length === nextOrder.length &&
        prev.every((value, index) => value === nextOrder[index])
      ) {
        return prev
      }
      return nextOrder
    })
  }, [photos])

  const scheduleMeasureVisualOrder = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
    }
    rafRef.current = requestAnimationFrame(() => {
      measureVisualOrder()
    })
  }, [measureVisualOrder])

  useEffect(() => {
    setVisualOrder(photos.map((_, index) => index))
    scheduleMeasureVisualOrder()

    const handleResize = () => scheduleMeasureVisualOrder()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [photos, scheduleMeasureVisualOrder])

  const prefetchPhoto = useCallback((photo: Photo) => {
    if (prefetchedPhotoIdsRef.current.has(photo.id)) return
    prefetchedPhotoIdsRef.current.add(photo.id)
    const targetWidth = hasPhotoMetadata(photo) && window.innerWidth >= 768
      ? Math.max(320, window.innerWidth - 280)
      : window.innerWidth
    const image = new window.Image()
    image.decoding = 'async'
    image.src = buildNextImageUrl(photo.url, closestNextImageWidth(targetWidth), LIGHTBOX_PREFETCH_QUALITY)
  }, [])

  const orderedPhotos = useMemo(() => {
    if (visualOrder.length !== photos.length) return photos
    return visualOrder.map((originalIndex) => photos[originalIndex])
  }, [photos, visualOrder])

  const visualIndexByOriginal = useMemo(() => {
    const map = new Map<number, number>()
    visualOrder.forEach((originalIndex, visualIndex) => {
      map.set(originalIndex, visualIndex)
    })
    return map
  }, [visualOrder])

  const handleClose = useCallback(() => setSelectedIndex(null), [])
  const handlePrev = useCallback(() => {
    setMorphPhotoId(null)
    setSelectedIndex((i) =>
      i !== null ? (i - 1 + orderedPhotos.length) % orderedPhotos.length : null,
    )
  }, [orderedPhotos.length])
  const handleNext = useCallback(() => {
    setMorphPhotoId(null)
    setSelectedIndex((i) =>
      i !== null ? (i + 1) % orderedPhotos.length : null,
    )
  }, [orderedPhotos.length])

  return (
    <>
      <div
        ref={galleryRef}
        className="columns-1 sm:columns-2 lg:columns-3 gap-3"
      >
        {photos.map((photo, index) => {
          const width = photo.width > 0 ? photo.width : 1600
          const height = photo.height > 0 ? photo.height : 1200

          return (
            <button
              key={photo.id}
              type="button"
              aria-label={`Open photo ${index + 1}${photo.metadata.location ? `, ${photo.metadata.location}` : ''}`}
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') prefetchPhoto(photo)
              }}
              onFocus={() => prefetchPhoto(photo)}
              ref={(el) => {
                if (el) itemRefs.current.set(photo.id, el)
                else itemRefs.current.delete(photo.id)
              }}
              onClick={() => {
                const visualIndex = visualIndexByOriginal.get(index)
                setMorphPhotoId(photo.id)
                setSelectedIndex(visualIndex ?? index)
              }}
              className={cn(
                'gallery-item',
                'block w-full mb-3 break-inside-avoid',
                'rounded-lg',
                'cursor-pointer',
                'transition-[filter] duration-150 ease-out',
                'hover:brightness-[1.04]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              )}
            >
              {/* Keep clipping on the shared element so the close morph can
                  extend beyond the grid button without being cropped. */}
              <motion.span
                layoutId={`photo-${photo.id}`}
                transition={SPRING_MORPH}
                className="block overflow-hidden rounded-xl"
              >
                <Image
                  src={photo.url}
                  alt=""
                  width={width}
                  height={height}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1800px) 33vw, 600px"
                  quality={95}
                  preload={index === 0}
                  loading={index < 3 ? 'eager' : 'lazy'}
                  fetchPriority={index < 2 ? 'high' : 'auto'}
                  className="image-outline w-full h-auto block"
                  onLoad={scheduleMeasureVisualOrder}
                />
              </motion.span>
            </button>
          )
        })}
      </div>

      {/* AnimatePresence must own the conditional render — inside the lightbox
          it would unmount with it and the exit animation would never run */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <PhotoLightbox
            photos={orderedPhotos}
            currentIndex={selectedIndex}
            onClose={handleClose}
            onPrev={handlePrev}
            onNext={handleNext}
            morphPhotoId={morphPhotoId}
          />
        )}
      </AnimatePresence>
    </>
  )
}
