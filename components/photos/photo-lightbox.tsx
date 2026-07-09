'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Camera,
  Aperture,
  Timer,
  Gauge,
  Maximize2,
  Calendar,
  MapPin,
  CircleDot,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react'
import type { Photo, PhotoMetadata } from '@/lib/photos'
import { EASE_OUT } from '@/lib/motion'

interface PhotoLightboxProps {
  photos: Photo[]
  currentIndex: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

const METADATA_FIELDS: {
  key: keyof PhotoMetadata
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { key: 'camera', label: 'Camera', icon: Camera },
  { key: 'lens', label: 'Lens', icon: CircleDot },
  { key: 'focalLength', label: 'Focal Length', icon: Maximize2 },
  { key: 'aperture', label: 'Aperture', icon: Aperture },
  { key: 'shutterSpeed', label: 'Shutter', icon: Timer },
  { key: 'iso', label: 'ISO', icon: Gauge },
  { key: 'dateTaken', label: 'Date', icon: Calendar },
  { key: 'location', label: 'Location', icon: MapPin },
]

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function formatAperture(raw: string): string {
  // "f/1.7799999713880652" -> "f/1.8"
  const match = raw.match(/f\/([\d.]+)/)
  if (!match) return raw
  const num = parseFloat(match[1])
  return `f/${Math.round(num * 10) / 10}`
}

const MIN_ZOOM = 1
const MAX_ZOOM = 5
const ZOOM_STEP = 0.5
const LIGHTBOX_QUALITY = 100
const NEXT_IMAGE_WIDTHS = [640, 750, 828, 1080, 1200, 1920, 2048, 3840] as const

function closestNextImageWidth(target: number): number {
  return NEXT_IMAGE_WIDTHS.find((size) => size >= target) ?? NEXT_IMAGE_WIDTHS[NEXT_IMAGE_WIDTHS.length - 1]
}

function buildNextImageUrl(url: string, width: number, quality: number): string {
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`
}

function hasPhotoMetadata(photo: Photo): boolean {
  return Object.values(photo.metadata).some((value) => value !== undefined && value !== null && value !== '')
}

const COORD_PATTERN = /^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/

function useLocationDisplay(raw: string | undefined): { display: string; loading: boolean } {
  const [display, setDisplay] = useState(raw ?? '')
  const [loading, setLoading] = useState(false)
  const cacheRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    if (!raw || !COORD_PATTERN.test(raw.trim())) {
      setDisplay(raw ?? '')
      setLoading(false)
      return
    }

    const cached = cacheRef.current.get(raw)
    if (cached) {
      setDisplay(cached)
      setLoading(false)
      return
    }

    const [lat, lon] = raw.split(',').map((s) => s.trim())
    setDisplay(raw)
    setLoading(true)

    fetch(`/api/geocode?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { display?: string } | null) => {
        const result = data?.display ?? raw
        cacheRef.current.set(raw, result)
        setDisplay(result)
      })
      .catch(() => setDisplay(raw))
      .finally(() => setLoading(false))
  }, [raw])

  return { display, loading }
}

export function PhotoLightbox({
  photos,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: PhotoLightboxProps) {
  const photo = photos[currentIndex]
  const prevPhoto = photos[(currentIndex - 1 + photos.length) % photos.length]
  const nextPhoto = photos[(currentIndex + 1) % photos.length]
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isMobileMetadataExpanded, setIsMobileMetadataExpanded] = useState(false)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const panStart = useRef({ x: 0, y: 0 })
  const metadataTouchStart = useRef<{ y: number; t: number } | null>(null)
  const swipeTouchStart = useRef<{ x: number; y: number; t: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const availableFields = METADATA_FIELDS.filter((f) => {
    const val = photo.metadata[f.key]
    return val !== undefined && val !== null && val !== ''
  })
  const hasMetadata = availableFields.length > 0
  const locationDisplay = useLocationDisplay(photo.metadata.location)

  // Rapid prev/next presses skip the enter animation — only the first
  // navigation in a burst animates, the rest swap instantly.
  const prevIndexRef = useRef(currentIndex)
  const lastNavTimeRef = useRef(0)
  const rapidNavRef = useRef(false)
  if (prevIndexRef.current !== currentIndex) {
    const now = performance.now()
    rapidNavRef.current = now - lastNavTimeRef.current < 350
    lastNavTimeRef.current = now
    prevIndexRef.current = currentIndex
  }

  // Reset zoom/pan on photo change
  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setIsMobileMetadataExpanded(false)
  }, [currentIndex])

  // Prefetch neighbors only (not the full album).
  useEffect(() => {
    if (photos.length <= 1) return
    const viewportWidth = window.innerWidth
    ;[prevPhoto, nextPhoto].forEach((targetPhoto) => {
      const targetWidth = hasPhotoMetadata(targetPhoto) && viewportWidth >= 768
        ? Math.max(320, viewportWidth - 280)
        : viewportWidth
      const optimizedWidth = closestNextImageWidth(targetWidth)
      const img = new window.Image()
      img.decoding = 'async'
      img.src = buildNextImageUrl(targetPhoto.url, optimizedWidth, LIGHTBOX_QUALITY)
    })
  }, [photos.length, prevPhoto, nextPhoto])

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM))
  }, [])

  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const next = Math.max(z - ZOOM_STEP, MIN_ZOOM)
      if (next === 1) setPan({ x: 0, y: 0 })
      return next
    })
  }, [])

  const resetZoom = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  // Keyboard
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') onPrev()
      else if (e.key === 'ArrowRight') onNext()
      else if (e.key === '+' || e.key === '=') zoomIn()
      else if (e.key === '-') zoomOut()
      else if (e.key === '0') resetZoom()
    },
    [onClose, onPrev, onNext, zoomIn, zoomOut, resetZoom],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      if (e.deltaY < 0) zoomIn()
      else zoomOut()
    },
    [zoomIn, zoomOut],
  )

  // Pan via drag when zoomed
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (zoom <= 1) return
      isDragging.current = true
      dragStart.current = { x: e.clientX, y: e.clientY }
      panStart.current = { ...pan }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [zoom, pan],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return
      setPan({
        x: panStart.current.x + (e.clientX - dragStart.current.x),
        y: panStart.current.y + (e.clientY - dragStart.current.y),
      })
    },
    [],
  )

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  // Double-click to toggle zoom
  const handleDoubleClick = useCallback(() => {
    if (zoom > 1) {
      resetZoom()
    } else {
      setZoom(2.5)
    }
  }, [zoom, resetZoom])


  const handleMetadataTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const y = e.touches[0]?.clientY
    metadataTouchStart.current =
      typeof y === 'number' ? { y, t: performance.now() } : null
  }, [])

  const handleMetadataTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const start = metadataTouchStart.current
    if (start === null) return

    const endY = e.changedTouches[0]?.clientY
    if (typeof endY !== 'number') return

    const deltaY = endY - start.y
    const velocity = Math.abs(deltaY) / Math.max(performance.now() - start.t, 1)
    // A quick flick counts even when it travels less than the distance threshold
    if (Math.abs(deltaY) > 30 || (velocity > 0.11 && Math.abs(deltaY) > 10)) {
      setIsMobileMetadataExpanded(deltaY < 0)
    }

    metadataTouchStart.current = null
  }, [])

  const isZoomed = zoom > 1

  const handleImageTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0]
    if (!touch) return
    swipeTouchStart.current = { x: touch.clientX, y: touch.clientY, t: performance.now() }
  }, [])

  const handleImageTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (isZoomed || photos.length <= 1) return

    const start = swipeTouchStart.current
    const touch = e.changedTouches[0]
    if (!start || !touch) return

    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    const SWIPE_THRESHOLD = 45
    const velocity = Math.abs(deltaX) / Math.max(performance.now() - start.t, 1)
    // A quick flick counts even when it travels less than the distance threshold
    const passes =
      Math.abs(deltaX) > SWIPE_THRESHOLD || (velocity > 0.11 && Math.abs(deltaX) > 12)

    if (passes && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) onPrev()
      else onNext()
    }

    swipeTouchStart.current = null
  }, [isZoomed, photos.length, onPrev, onNext])

  return (
    <motion.div
      key="lightbox-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      className="fixed inset-0 z-[100] bg-white/95 dark:bg-black/95"
      onClick={onClose}
    >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute z-20 p-2.5 rounded-full bg-black/5 border border-black/10 text-black/70 hover:text-black hover:bg-black/10 dark:bg-white/5 dark:border-white/10 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10 transition-[color,background-color,opacity,transform] duration-150 ease-out active:scale-95 cursor-pointer"
          style={{
            top: 'max(1rem, env(safe-area-inset-top))',
            right: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Zoom controls, bottom-center of image */}
        <div
          className={`hidden md:flex absolute z-20 items-center gap-1 rounded-full bg-white/80 border border-black/10 dark:bg-black/60 dark:border-white/10 p-1 backdrop-blur-sm left-1/2 -translate-x-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] md:top-auto md:bottom-6 ${hasMetadata ? 'md:left-[calc((100%-280px)/2)]' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="p-1.5 rounded-full text-black/60 hover:text-black hover:bg-black/10 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10 transition-[color,background-color,opacity,transform] duration-150 ease-out active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-default"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-[11px] text-black/50 dark:text-white/50 tabular-nums w-12 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="p-1.5 rounded-full text-black/60 hover:text-black hover:bg-black/10 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10 transition-[color,background-color,opacity,transform] duration-150 ease-out active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-default"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          {isZoomed && (
            <button
              onClick={resetZoom}
              className="p-1.5 rounded-full text-black/60 hover:text-black hover:bg-black/10 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10 transition-[color,background-color,opacity,transform] duration-150 ease-out active:scale-95 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Prev / Next */}
        {photos.length > 1 && !isZoomed && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onPrev() }}
              className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/5 border border-black/10 text-black/60 hover:text-black hover:bg-black/10 dark:bg-white/5 dark:border-white/10 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10 transition-[color,background-color,opacity,transform] duration-150 ease-out active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onNext() }}
              className={`absolute top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/5 border border-black/10 text-black/60 hover:text-black hover:bg-black/10 dark:bg-white/5 dark:border-white/10 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10 transition-[color,background-color,opacity,transform] duration-150 ease-out active:scale-95 cursor-pointer right-3 ${hasMetadata ? 'md:right-[calc(280px+1.25rem)]' : 'md:right-5'}`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Main layout: photo + optional side panel */}
        <motion.div
          key={photo.id}
          initial={rapidNavRef.current ? false : { opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.99 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="h-full flex"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Photo area */}
          <div
            ref={containerRef}
            className={`flex-1 flex items-center justify-center p-4 md:p-8 min-w-0 overflow-hidden ${hasMetadata && !isZoomed ? (isMobileMetadataExpanded ? 'pb-64 md:pb-8' : 'pb-16 md:pb-8') : ''}`}
            onClick={(e) => {
              if (!isZoomed) onClose()
            }}
            onWheel={handleWheel}
            onTouchStart={handleImageTouchStart}
            onTouchEnd={handleImageTouchEnd}
          >
            <Image
              src={photo.url}
              alt=""
              width={photo.width > 0 ? photo.width : 2000}
              height={photo.height > 0 ? photo.height : 1333}
              sizes={hasMetadata ? '(max-width: 768px) 100vw, calc(100vw - 280px)' : '100vw'}
              quality={LIGHTBOX_QUALITY}
              preload
              draggable={false}
              fetchPriority="high"
              onDoubleClick={handleDoubleClick}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="max-w-full max-h-full w-auto h-auto object-contain select-none"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transition: isDragging.current ? 'none' : 'transform 0.2s ease-out',
                cursor: isZoomed ? (isDragging.current ? 'grabbing' : 'grab') : 'zoom-in',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Metadata panel, desktop */}
          {hasMetadata && (
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0.04, ease: EASE_OUT }}
              className="hidden md:flex w-[280px] shrink-0 border-l border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm flex-col justify-center px-6 py-8"
            >
              <div className="space-y-5">
                {availableFields.map(({ key, label, icon: Icon }) => {
                  let value = String(photo.metadata[key])
                  if (key === 'dateTaken') value = formatDate(value)
                  if (key === 'aperture') value = formatAperture(value)
                  if (key === 'location') value = locationDisplay.loading ? '…' : locationDisplay.display

                  return (
                    <div key={key} className="flex items-start gap-3">
                      <Icon className="h-3.5 w-3.5 mt-[3px] text-black/30 dark:text-white/30 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40 leading-none mb-1.5">
                          {label}
                        </p>
                        <p className="text-[13px] text-black/80 dark:text-white/80 leading-tight break-words">
                          {value}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Counter */}
              <div className="mt-8 pt-5 border-t border-black/[0.08] dark:border-white/[0.08]">
                <p className="text-[11px] text-black/25 dark:text-white/25 tabular-nums">
                  {currentIndex + 1} / {photos.length}
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Mobile metadata sheet */}
        {hasMetadata && !isZoomed && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.04, ease: EASE_OUT }}
            className="md:hidden absolute bottom-0 inset-x-0 z-10 border-t border-black/10 dark:border-white/10 bg-white/95 dark:bg-black/88 backdrop-blur-md rounded-t-2xl"
            style={{
              paddingBottom: `calc(env(safe-area-inset-bottom) + ${isMobileMetadataExpanded ? '1rem' : '0.35rem'})`,
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleMetadataTouchStart}
            onTouchEnd={handleMetadataTouchEnd}
          >
            <button
              type="button"
              onClick={() => setIsMobileMetadataExpanded((prev) => !prev)}
              className="w-full px-5 py-3"
            >
              <span className="mx-auto mb-2 block h-1 w-12 rounded-full bg-black/25 dark:bg-white/25" />
            </button>

            {/* 0fr→1fr animates to the real content height, unlike max-height
                which eases toward an arbitrary cap and distorts the timing */}
            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${isMobileMetadataExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="max-h-72 overflow-y-auto px-5 pb-2">
                  <div className="grid grid-cols-2 gap-x-5 gap-y-3 pb-2">
                {availableFields.map(({ key, label, icon: Icon }) => {
                  let value = String(photo.metadata[key])
                  if (key === 'dateTaken') value = formatDate(value)
                  if (key === 'aperture') value = formatAperture(value)
                  if (key === 'location') value = locationDisplay.loading ? '…' : locationDisplay.display

                  return (
                    <div key={key} className="flex min-w-0 items-start gap-2">
                      <Icon className="h-3 w-3 mt-[2px] text-black/40 dark:text-white/40 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] uppercase tracking-wider text-black/45 dark:text-white/45 leading-none mb-1">
                          {label}
                        </p>
                        <p className="text-xs text-black/85 dark:text-white/85 leading-tight break-words">
                          {value}
                        </p>
                      </div>
                    </div>
                  )
                })}
                  </div>
                </div>
              </div>
            </div>

            {isMobileMetadataExpanded && (
              <p className="px-5 text-[10px] text-black/35 dark:text-white/35 tabular-nums mt-1">
                {currentIndex + 1} / {photos.length}
              </p>
            )}
          </motion.div>
        )}
    </motion.div>
  )
}
