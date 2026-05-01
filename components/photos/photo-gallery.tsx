'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { Photo } from '@/lib/photos'
import { PhotoLightbox } from './photo-lightbox'

interface PhotoGalleryProps {
  photos: Photo[]
}

interface PositionedItem {
  originalIndex: number
  top: number
  left: number
}

const INITIAL_GALLERY_LOAD_TARGET = 3
const LIGHTBOX_PREFETCH_DELAY_MS = 250
const LIGHTBOX_PREFETCH_QUALITY = 100
const LIGHTBOX_PREFETCH_CONCURRENCY = 4
const GEOCODE_PREFETCH_DELAY_MS = 1100
const NEXT_IMAGE_WIDTHS = [640, 750, 828, 1080, 1200, 1920, 2048, 3840] as const

const COORD_PATTERN = /^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/

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
  const [loadedGalleryCount, setLoadedGalleryCount] = useState(0)
  const galleryRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef(new Map<string, HTMLButtonElement>())
  const rafRef = useRef<number | null>(null)
  const loadedPhotoIdsRef = useRef(new Set<string>())
  const didStartLightboxPrefetchRef = useRef(false)
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
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in')
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -60px 0px' },
    )

    const items = galleryRef.current?.querySelectorAll('.gallery-item')
    items?.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [photos])

  useEffect(() => {
    loadedPhotoIdsRef.current.clear()
    didStartLightboxPrefetchRef.current = false
    setLoadedGalleryCount(0)

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

  useEffect(() => {
    if (photos.length === 0) return
    if (didStartLightboxPrefetchRef.current) return

    const requiredLoaded = Math.min(INITIAL_GALLERY_LOAD_TARGET, photos.length)
    if (loadedGalleryCount < requiredLoaded) return

    didStartLightboxPrefetchRef.current = true
    let cancelled = false

    const viewportWidth = window.innerWidth
    const prefetchUrls = Array.from(
      new Set(
        photos.map((photo) => {
          const targetWidth = hasPhotoMetadata(photo) && viewportWidth >= 768
            ? Math.max(320, viewportWidth - 280)
            : viewportWidth
          const optimizedWidth = closestNextImageWidth(targetWidth)
          return buildNextImageUrl(photo.url, optimizedWidth, LIGHTBOX_PREFETCH_QUALITY)
        }),
      ),
    )

    const prefetchImage = (url: string) =>
      new Promise<void>((resolve) => {
        const img = new window.Image()
        img.decoding = 'async'
        img.onload = () => resolve()
        img.onerror = () => resolve()
        img.src = url
      })

    const startPrefetch = async () => {
      let cursor = 0
      const runWorker = async () => {
        while (!cancelled) {
          const index = cursor++
          if (index >= prefetchUrls.length) break
          await prefetchImage(prefetchUrls[index])
        }
      }

      const workers = Array.from(
        { length: Math.min(LIGHTBOX_PREFETCH_CONCURRENCY, prefetchUrls.length) },
        () => runWorker(),
      )

      await Promise.all(workers)
    }

    const timeout = window.setTimeout(() => {
      void startPrefetch()
    }, LIGHTBOX_PREFETCH_DELAY_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [photos, loadedGalleryCount])

  // Ping /api/geocode for lat,lng strings so the lightbox map isn't cold.
  useEffect(() => {
    if (photos.length === 0) return

    const coordLocations = photos
      .map((p) => p.metadata?.location?.trim())
      .filter((loc): loc is string => !!loc && COORD_PATTERN.test(loc))

    if (coordLocations.length === 0) return

    const seen = new Set<string>()
    const toFetch = coordLocations.filter((loc) => {
      if (seen.has(loc)) return false
      seen.add(loc)
      return true
    })

    let cancelled = false

    const run = async () => {
      for (const loc of toFetch) {
        if (cancelled) break
        const [lat, lon] = loc.split(',').map((s) => s.trim())
        fetch(`/api/geocode?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`).catch(
          () => {},
        )
        await new Promise((r) => setTimeout(r, GEOCODE_PREFETCH_DELAY_MS))
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [photos])

  const handleGalleryImageLoad = useCallback(
    (photoId: string) => {
      scheduleMeasureVisualOrder()

      if (loadedPhotoIdsRef.current.has(photoId)) return
      loadedPhotoIdsRef.current.add(photoId)
      setLoadedGalleryCount((count) => count + 1)
    },
    [scheduleMeasureVisualOrder],
  )

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
  const handlePrev = useCallback(
    () =>
      setSelectedIndex((i) =>
        i !== null ? (i - 1 + orderedPhotos.length) % orderedPhotos.length : null,
      ),
    [orderedPhotos.length],
  )
  const handleNext = useCallback(
    () =>
      setSelectedIndex((i) =>
        i !== null ? (i + 1) % orderedPhotos.length : null,
      ),
    [orderedPhotos.length],
  )

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
              ref={(el) => {
                if (el) itemRefs.current.set(photo.id, el)
                else itemRefs.current.delete(photo.id)
              }}
              onClick={() => {
                const visualIndex = visualIndexByOriginal.get(index)
                setSelectedIndex(visualIndex ?? index)
              }}
              className={cn(
                'gallery-item',
                'animate-on-scroll',
                'block w-full mb-3 break-inside-avoid',
                'rounded-lg overflow-hidden',
                'cursor-pointer',
                'transition-all duration-300 ease-out',
                'hover:brightness-[1.03] hover:scale-[1.003]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              )}
              style={{ transitionDelay: `${Math.min(index * 30, 200)}ms` }}
            >
              <Image
                src={photo.url}
                alt=""
                width={width}
                height={height}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                quality={95}
                preload={index === 0}
                loading={index < 3 ? 'eager' : 'lazy'}
                fetchPriority={index < 2 ? 'high' : 'auto'}
                className="w-full h-auto block"
                onLoad={() => handleGalleryImageLoad(photo.id)}
              />
            </button>
          )
        })}
      </div>

      {selectedIndex !== null && (
        <PhotoLightbox
          photos={orderedPhotos}
          currentIndex={selectedIndex}
          onClose={handleClose}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </>
  )
}
