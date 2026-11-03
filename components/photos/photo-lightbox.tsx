'use client'

import { useEffect, useLayoutEffect, useCallback, useState, useRef } from 'react'
import Image from 'next/image'
import { animate, motion, useMotionTemplate, useMotionValue, useTransform } from 'motion/react'
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
import { EASE_OUT, SPRING_MORPH } from '@/lib/motion'
import { useMediaQuery } from '@/hooks/use-media-query'

const MotionImage = motion.create(Image)

interface PhotoLightboxProps {
  photos: Photo[]
  currentIndex: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  morphPhotoId?: string | null
}

const METADATA_FIELDS: {
  key: keyof PhotoMetadata
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { key: 'camera', label: 'Camera', icon: Camera },
  { key: 'lens', label: 'Lens', icon: CircleDot },
  { key: 'focalLength', label: 'Focal length', icon: Maximize2 },
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
  const match = raw.match(/f\/([\d.]+)/)
  if (!match) return raw
  const num = parseFloat(match[1])
  return `f/${Math.round(num * 10) / 10}`
}

const MIN_ZOOM = 1
const MAX_ZOOM = 5
const ZOOM_STEP = 0.5
const DOUBLE_CLICK_ZOOM = 2.5
const OVERSCROLL_RESISTANCE = 0.3
const SWIPE_ENTER_OFFSET = 24
const SWIPE_MAX_VELOCITY = 2000
const SWIPE_VELOCITY_TO_OFFSET = 1 / 50
const SHEET_FLICK_VELOCITY = 0.11
const SHEET_TAP_SLOP = 12
const SHEET_CLICK_SUPPRESS_MS = 500
const SHEET_SPRING = { type: 'spring', duration: 0.35, bounce: 0 } as const
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

export function PhotoLightbox({
  photos,
  currentIndex,
  onClose,
  onPrev,
  onNext,
  morphPhotoId = null,
}: PhotoLightboxProps) {
  const photo = photos[currentIndex]
  const prevPhoto = photos[(currentIndex - 1 + photos.length) % photos.length]
  const nextPhoto = photos[(currentIndex + 1) % photos.length]
  const [zoomState, setZoomState] = useState({ photoId: photo.id, value: 1 })
  const isCurrentPhoto = zoomState.photoId === photo.id
  const zoom = isCurrentPhoto ? zoomState.value : 1
  const setZoom = useCallback((value: number) => {
    setZoomState({ photoId: photo.id, value })
  }, [photo.id])
  const panX = useMotionValue(0)
  const panY = useMotionValue(0)
  const imageTransform = useMotionTemplate`translate(${panX}px, ${panY}px) scale(${zoom})`
  const setPan = useCallback((next: { x: number; y: number }) => {
    panX.set(next.x)
    panY.set(next.y)
  }, [panX, panY])
  const [isMobileMetadataExpanded, setIsMobileMetadataExpanded] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const panStart = useRef({ x: 0, y: 0 })
  const panBounds = useRef({ x: 0, y: 0 })
  const metadataTouchStart = useRef<{ y: number; t: number; base: number } | null>(null)
  const swipeTouchStart = useRef<{ x: number; y: number; t: number; base: number } | null>(null)
  const swipeIntent = useRef<'horizontal' | 'vertical' | null>(null)
  const swipeX = useMotionValue(0)
  const sheetY = useMotionValue(0)
  const [sheetTravel, setSheetTravel] = useState(0)
  const sheetTravelRef = useRef(0)
  const sheetCollapseProgress = useTransform(sheetY, (v) => {
    const travel = sheetTravelRef.current
    if (travel <= 0) return 1
    return Math.min(Math.max(v / travel, 0), 1)
  })
  const sheetContentTransform = useTransform(sheetCollapseProgress, (progress) =>
    `translateY(calc(env(safe-area-inset-bottom) * ${progress - 1}))`,
  )
  const sheetGestureCommittedAtRef = useRef(0)
  const sheetContentRef = useRef<HTMLDivElement>(null)
  const sheetScrollerRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const availableFields = METADATA_FIELDS.filter((f) => {
    const val = photo.metadata[f.key]
    return val !== undefined && val !== null && val !== ''
  })
  const hasMetadata = availableFields.length > 0

  const prevIndexRef = useRef(currentIndex)
  const lastNavTimeRef = useRef(0)
  const rapidNavRef = useRef(false)
  const keyboardNavRef = useRef(false)
  const enteredViaKeyboardRef = useRef(false)
  const gestureNavRef = useRef(false)
  const enteredViaGestureRef = useRef(false)
  const navIntentRef = useRef<0 | 1 | -1>(0)
  const navDirRef = useRef<0 | 1 | -1>(0)
  if (prevIndexRef.current !== currentIndex) {
    const now = performance.now()
    rapidNavRef.current = now - lastNavTimeRef.current < 350
    lastNavTimeRef.current = now
    enteredViaGestureRef.current = gestureNavRef.current
    enteredViaKeyboardRef.current = keyboardNavRef.current
    keyboardNavRef.current = false
    navDirRef.current = gestureNavRef.current ? 0 : navIntentRef.current
    gestureNavRef.current = false
    navIntentRef.current = 0
    prevIndexRef.current = currentIndex
  }

  useLayoutEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setIsMobileMetadataExpanded(false)
    sheetY.jump(sheetTravelRef.current)
  }, [currentIndex, sheetY, setPan, setZoom])

  useLayoutEffect(() => {
    if (!reducedMotion) return
    swipeX.jump(0)
    sheetY.jump(isMobileMetadataExpanded ? 0 : sheetTravel)
  }, [reducedMotion, swipeX, sheetY, isMobileMetadataExpanded, sheetTravel])

  useEffect(() => {
    if (zoom > 1) {
      setIsMobileMetadataExpanded(false)
      sheetY.jump(sheetTravelRef.current)
    }
  }, [zoom, sheetY])

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

  const getPanBounds = useCallback((z: number) => {
    const img = imgRef.current
    const container = containerRef.current
    if (!img || !container) return { x: 0, y: 0 }
    return {
      x: Math.max(0, (img.offsetWidth * z - container.clientWidth) / 2),
      y: Math.max(0, (img.offsetHeight * z - container.clientHeight) / 2),
    }
  }, [])

  const clampPan = useCallback(
    (next: { x: number; y: number }, z: number) => {
      const bounds = getPanBounds(z)
      return {
        x: Math.min(bounds.x, Math.max(-bounds.x, next.x)),
        y: Math.min(bounds.y, Math.max(-bounds.y, next.y)),
      }
    },
    [getPanBounds],
  )

  const applyZoom = useCallback(
    (nextZoom: number, origin?: { x: number; y: number }) => {
      const target = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom))
      if (target === MIN_ZOOM) {
        setZoom(MIN_ZOOM)
        setPan({ x: 0, y: 0 })
        return
      }
      const pan = { x: panX.get(), y: panY.get() }
      let next = pan
      if (origin && wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect()
        const baseX = rect.left + rect.width / 2
        const baseY = rect.top + rect.height / 2
        const dx = origin.x - baseX
        const dy = origin.y - baseY
        next = {
          x: dx - ((dx - pan.x) / zoom) * target,
          y: dy - ((dy - pan.y) / zoom) * target,
        }
      }
      setZoom(target)
      setPan(clampPan(next, target))
    },
    [zoom, panX, panY, setPan, setZoom, clampPan],
  )

  const zoomIn = useCallback(
    (origin?: { x: number; y: number }) => applyZoom(zoom + ZOOM_STEP, origin),
    [applyZoom, zoom],
  )

  const zoomOut = useCallback(
    (origin?: { x: number; y: number }) => applyZoom(zoom - ZOOM_STEP, origin),
    [applyZoom, zoom],
  )

  const resetZoom = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [setPan, setZoom])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        keyboardNavRef.current = true
        navIntentRef.current = -1
        onPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        keyboardNavRef.current = true
        navIntentRef.current = 1
        onNext()
      }
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

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null
    rootRef.current?.focus({ preventScroll: true })
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const root = rootRef.current
      if (!root) return
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.getClientRects().length > 0)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (!active || (active !== root && !root.contains(active))) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      } else if (e.shiftKey && (active === first || active === root)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onTab)
    return () => {
      document.removeEventListener('keydown', onTab)
      returnFocusRef.current?.focus({ preventScroll: true })
    }
  }, [])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const origin = { x: e.clientX, y: e.clientY }
      if (e.deltaY < 0) zoomIn(origin)
      else zoomOut(origin)
    },
    [zoomIn, zoomOut],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (zoom <= 1) return
      setIsPanning(true)
      dragStart.current = { x: e.clientX, y: e.clientY }
      panStart.current = { x: panX.get(), y: panY.get() }
      panBounds.current = getPanBounds(zoom)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [zoom, panX, panY, getPanBounds],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning) return
      const bounds = panBounds.current
      const rubber = (value: number, max: number) => {
        if (value > max) return max + (value - max) * OVERSCROLL_RESISTANCE
        if (value < -max) return -max + (value + max) * OVERSCROLL_RESISTANCE
        return value
      }
      setPan({
        x: rubber(panStart.current.x + (e.clientX - dragStart.current.x), bounds.x),
        y: rubber(panStart.current.y + (e.clientY - dragStart.current.y), bounds.y),
      })
    },
    [isPanning, setPan],
  )

  const handlePointerUp = useCallback(() => {
    if (!isPanning) return
    setIsPanning(false)
    setPan(clampPan({ x: panX.get(), y: panY.get() }, zoom))
  }, [isPanning, zoom, clampPan, panX, panY, setPan])

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (zoom > 1) resetZoom()
      else applyZoom(DOUBLE_CLICK_ZOOM, { x: e.clientX, y: e.clientY })
    },
    [zoom, resetZoom, applyZoom],
  )

  useLayoutEffect(() => {
    const el = sheetContentRef.current
    if (!el) return
    const measure = () => {
      sheetTravelRef.current = el.offsetHeight
      setSheetTravel(el.offsetHeight)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMetadata, zoom, currentIndex])

  const appliedTravelRef = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (appliedTravelRef.current === sheetTravel) return
    appliedTravelRef.current = sheetTravel
    if (!isMobileMetadataExpanded) sheetY.jump(sheetTravel)
  }, [sheetTravel, isMobileMetadataExpanded, sheetY])

  const setSheetExpanded = useCallback(
    (expanded: boolean, velocity = 0) => {
      setIsMobileMetadataExpanded(expanded)
      const target = expanded ? 0 : sheetTravel
      if (reducedMotion) sheetY.jump(target)
      else animate(sheetY, target, { ...SHEET_SPRING, velocity })
    },
    [sheetTravel, reducedMotion, sheetY],
  )

  const settleSheet = useCallback(() => {
    setSheetExpanded(sheetY.get() < sheetTravel / 2)
  }, [setSheetExpanded, sheetY, sheetTravel])

  const handleMetadataTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const y = e.touches[0]?.clientY
    if (typeof y !== 'number') {
      metadataTouchStart.current = null
      return
    }
    sheetY.stop()
    sheetGestureCommittedAtRef.current = 0
    metadataTouchStart.current = { y, t: performance.now(), base: sheetY.get() }
  }, [sheetY])

  const handleMetadataTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const start = metadataTouchStart.current
      const y = e.touches[0]?.clientY
      if (start === null || typeof y !== 'number') return
      const deltaY = y - start.y
      const scroller = sheetScrollerRef.current
      if (scroller && scroller.contains(e.target as Node)) {
        const listOwnsGesture =
          scroller.scrollTop > 0 || (start.base === 0 && deltaY < 0)
        if (listOwnsGesture) {
          metadataTouchStart.current = null
          settleSheet()
          return
        }
      }
      const raw = start.base + deltaY
      const overshoot =
        raw < 0 ? raw * OVERSCROLL_RESISTANCE
        : raw > sheetTravel ? sheetTravel + (raw - sheetTravel) * OVERSCROLL_RESISTANCE
        : raw
      sheetY.set(overshoot)
    },
    [sheetTravel, sheetY, settleSheet],
  )

  const handleMetadataTouchCancel = useCallback(() => {
    if (metadataTouchStart.current === null) return
    metadataTouchStart.current = null
    settleSheet()
  }, [settleSheet])

  const handleMetadataTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const start = metadataTouchStart.current
      metadataTouchStart.current = null
      if (start === null) return

      const endY = e.changedTouches[0]?.clientY
      if (typeof endY !== 'number') return

      const deltaY = endY - start.y
      if (Math.abs(deltaY) < SHEET_TAP_SLOP) {
        const rest = isMobileMetadataExpanded ? 0 : sheetTravel
        if (sheetY.get() !== rest) setSheetExpanded(isMobileMetadataExpanded)
        return
      }

      const velocity = deltaY / Math.max(performance.now() - start.t, 1)
      const expand =
        Math.abs(velocity) > SHEET_FLICK_VELOCITY
          ? velocity < 0
          : sheetY.get() < sheetTravel / 2
      sheetGestureCommittedAtRef.current = performance.now()
      setSheetExpanded(expand, velocity * 1000)
    },
    [sheetTravel, sheetY, setSheetExpanded, isMobileMetadataExpanded],
  )

  const isZoomed = zoom > 1

  const handleImageTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0]
    if (!touch) return
    swipeTouchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      t: performance.now(),
      base: swipeX.get(),
    }
    swipeIntent.current = null
    swipeX.stop()
  }, [swipeX])

  const handleImageTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (isZoomed || photos.length <= 1 || reducedMotion) return
      const start = swipeTouchStart.current
      const touch = e.touches[0]
      if (!start || !touch) return

      const deltaX = touch.clientX - start.x
      const deltaY = touch.clientY - start.y
      if (!swipeIntent.current && Math.hypot(deltaX, deltaY) > 10) {
        swipeIntent.current =
          Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical'
      }
      if (swipeIntent.current === 'horizontal') swipeX.set(start.base + deltaX)
    },
    [isZoomed, photos.length, reducedMotion, swipeX],
  )

  const handleImageTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (isZoomed || photos.length <= 1) return

    const start = swipeTouchStart.current
    const touch = e.changedTouches[0]
    if (!start || !touch) return

    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    const SWIPE_THRESHOLD = 45
    const velocity = Math.abs(deltaX) / Math.max(performance.now() - start.t, 1)
    const passes =
      Math.abs(deltaX) > SWIPE_THRESHOLD || (velocity > 0.11 && Math.abs(deltaX) > 12)

    if (passes && Math.abs(deltaX) > Math.abs(deltaY)) {
      gestureNavRef.current = true
      if (reducedMotion) {
        swipeX.jump(0)
      } else {
        const released = Math.min(velocity * 1000, SWIPE_MAX_VELOCITY)
        const offset = SWIPE_ENTER_OFFSET + released * SWIPE_VELOCITY_TO_OFFSET
        swipeX.jump(-Math.sign(deltaX) * offset)
        animate(swipeX, 0, {
          type: 'spring',
          duration: 0.3,
          bounce: 0,
          velocity: Math.sign(deltaX) * released,
        })
      }
      if (deltaX > 0) onPrev()
      else onNext()
    } else {
      if (reducedMotion) swipeX.jump(0)
      else animate(swipeX, 0, { type: 'spring', duration: 0.3, bounce: 0 })
    }

    swipeTouchStart.current = null
    swipeIntent.current = null
  }, [isZoomed, photos.length, onPrev, onNext, swipeX, reducedMotion])

  const handleImageTouchCancel = useCallback(() => {
    if (reducedMotion) swipeX.jump(0)
    else animate(swipeX, 0, { type: 'spring', duration: 0.3, bounce: 0 })
    swipeTouchStart.current = null
    swipeIntent.current = null
  }, [swipeX, reducedMotion])

  return (
    <motion.div
      key="lightbox-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      tabIndex={-1}
      className="fixed inset-0 z-[100] bg-white/95 dark:bg-black/95 outline-none"
      onClick={onClose}
    >
        <button
          onClick={onClose}
          aria-label="Close"
          className="touch-target absolute z-20 p-2.5 rounded-full bg-black/5 border border-black/10 text-black/70 hover:text-black hover:bg-black/10 dark:bg-white/5 dark:border-white/10 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10 transition-[color,background-color,opacity,transform,translate,scale] duration-150 ease-out motion-safe:active:scale-[0.97] cursor-pointer"
          style={{
            top: 'max(1rem, env(safe-area-inset-top))',
            right: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
          <X className="h-5 w-5" />
        </button>

        <div
          className={`hidden md:flex absolute z-20 items-center gap-1 rounded-full bg-white/80 border border-black/10 dark:bg-black/60 dark:border-white/10 p-1 backdrop-blur-sm left-1/2 -translate-x-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] md:top-auto md:bottom-6 ${hasMetadata ? 'md:left-[calc((100%-280px)/2)]' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => zoomOut()}
            aria-label="Zoom out"
            disabled={zoom <= MIN_ZOOM}
            className="inline-flex size-11 items-center justify-center p-1.5 rounded-full text-black/60 hover:text-black hover:bg-black/10 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10 transition-[color,background-color,opacity,transform,translate,scale] duration-150 ease-out motion-safe:active:scale-[0.97] cursor-pointer disabled:opacity-30 disabled:cursor-default"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground tabular-nums w-12 text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => zoomIn()}
            aria-label="Zoom in"
            disabled={zoom >= MAX_ZOOM}
            className="inline-flex size-11 items-center justify-center p-1.5 rounded-full text-black/60 hover:text-black hover:bg-black/10 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10 transition-[color,background-color,opacity,transform,translate,scale] duration-150 ease-out motion-safe:active:scale-[0.97] cursor-pointer disabled:opacity-30 disabled:cursor-default"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          {isZoomed && (
            <button
              onClick={resetZoom}
              aria-label="Reset zoom"
              className="inline-flex size-11 items-center justify-center p-1.5 rounded-full text-black/60 hover:text-black hover:bg-black/10 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10 transition-[color,background-color,opacity,transform,translate,scale] duration-150 ease-out motion-safe:active:scale-[0.97] cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {photos.length > 1 && !isZoomed && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); navIntentRef.current = -1; onPrev() }}
              aria-label="Previous photo"
              className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/5 border border-black/10 text-black/60 hover:text-black hover:bg-black/10 dark:bg-white/5 dark:border-white/10 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10 transition-[color,background-color,opacity,transform,translate,scale] duration-150 ease-out motion-safe:active:scale-[0.97] cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navIntentRef.current = 1; onNext() }}
              aria-label="Next photo"
              className={`absolute top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/5 border border-black/10 text-black/60 hover:text-black hover:bg-black/10 dark:bg-white/5 dark:border-white/10 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10 transition-[color,background-color,opacity,transform,translate,scale] duration-150 ease-out motion-safe:active:scale-[0.97] cursor-pointer right-3 ${hasMetadata ? 'md:right-[calc(280px+1.25rem)]' : 'md:right-5'}`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <motion.div
          key={photo.id}
          initial={
            rapidNavRef.current || enteredViaKeyboardRef.current || photo.id === morphPhotoId
              ? false
              : enteredViaGestureRef.current
                ? { opacity: 0 }
                : navDirRef.current
                  ? { opacity: 0, transform: reducedMotion ? 'none' : `translateX(${navDirRef.current * 12}px)` }
                  : { opacity: 0, transform: reducedMotion ? 'none' : 'scale(0.99)' }
          }
          animate={{ opacity: 1, transform: 'none' }}
          exit={
            photo.id === morphPhotoId ? undefined : { opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } }
          }
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="h-full flex"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={containerRef}
            className={`flex-1 flex items-center justify-center p-4 md:p-8 min-w-0 overflow-hidden ${isZoomed ? 'touch-none' : 'touch-pan-y'} ${hasMetadata && !isZoomed ? (isMobileMetadataExpanded ? 'pb-64 md:pb-8' : 'pb-16 md:pb-8') : ''}`}
            onClick={(e) => {
              if (!isZoomed) onClose()
            }}
            onWheel={handleWheel}
            onTouchStart={handleImageTouchStart}
            onTouchMove={handleImageTouchMove}
            onTouchEnd={handleImageTouchEnd}
            onTouchCancel={handleImageTouchCancel}
          >
            <motion.div
              style={{ x: swipeX }}
              className="flex max-w-full min-h-0 self-stretch items-center justify-center"
            >
              <motion.div
                ref={wrapperRef}
                layoutId={photo.id === morphPhotoId ? `photo-${photo.id}` : undefined}
                transition={SPRING_MORPH}
                className="flex max-w-full min-h-0 self-stretch items-center justify-center"
              >
                <MotionImage
                  ref={imgRef}
                  src={photo.url}
                  alt={`Photo ${currentIndex + 1} of ${photos.length}${photo.metadata.location ? `, ${photo.metadata.location}` : ''}`}
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
                  onPointerCancel={handlePointerUp}
                  className="image-outline max-w-full max-h-full w-auto h-auto object-contain select-none"
                  style={{
                    transform: isCurrentPhoto ? imageTransform : 'none',
                    transition:
                      isPanning || reducedMotion
                        ? 'none'
                        : 'transform 0.2s var(--ease-out)',
                    cursor: isZoomed ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in',
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </motion.div>
            </motion.div>
          </div>

          {hasMetadata && (
            <div
              className="hidden md:flex w-[280px] shrink-0 border-l border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm flex-col justify-center px-6 py-8"
            >
              <div className="space-y-5">
                {availableFields.map(({ key, label, icon: Icon }) => {
                  let value = String(photo.metadata[key])
                  if (key === 'dateTaken') value = formatDate(value)
                  if (key === 'aperture') value = formatAperture(value)

                  return (
                    <div key={key} className="flex items-start gap-3">
                      <Icon className="h-3.5 w-3.5 mt-[3px] text-black/30 dark:text-white/30 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground leading-none mb-1.5">
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

              <div className="mt-8 pt-5 border-t border-black/[0.08] dark:border-white/[0.08]">
                <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
                  {currentIndex + 1} / {photos.length}
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {hasMetadata && !isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.04, ease: EASE_OUT }}
            className="md:hidden absolute bottom-0 inset-x-0 z-10 border-t border-black/10 dark:border-white/10 bg-white/95 dark:bg-black/88 backdrop-blur-md rounded-t-2xl"
            style={{ y: sheetY }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleMetadataTouchStart}
            onTouchMove={handleMetadataTouchMove}
            onTouchEnd={handleMetadataTouchEnd}
            onTouchCancel={handleMetadataTouchCancel}
          >
            <button
              type="button"
              onClick={() => {
                const committedAt = sheetGestureCommittedAtRef.current
                sheetGestureCommittedAtRef.current = 0
                if (committedAt && performance.now() - committedAt < SHEET_CLICK_SUPPRESS_MS) return
                setSheetExpanded(!isMobileMetadataExpanded)
              }}
              aria-label={isMobileMetadataExpanded ? 'Hide photo details' : 'Show photo details'}
              aria-expanded={isMobileMetadataExpanded}
              className="min-h-11 w-full touch-none px-5 pt-3 pb-[0.35rem]"
            >
              <span className="mx-auto mb-2 block h-1 w-12 rounded-full bg-black/25 dark:bg-white/25" />
            </button>

            <div
              aria-hidden
              style={{ height: 'env(safe-area-inset-bottom)' }}
            />

            <motion.div ref={sheetContentRef} inert={!isMobileMetadataExpanded} style={{ transform: sheetContentTransform }}>
              <div ref={sheetScrollerRef} className="max-h-72 overflow-y-auto px-5 pb-2">
                <div className="grid grid-cols-2 gap-x-5 gap-y-3 pb-2">
                {availableFields.map(({ key, label, icon: Icon }) => {
                  let value = String(photo.metadata[key])
                  if (key === 'dateTaken') value = formatDate(value)
                  if (key === 'aperture') value = formatAperture(value)

                  return (
                    <div key={key} className="flex min-w-0 items-start gap-2">
                      <Icon className="h-3 w-3 mt-[2px] text-black/40 dark:text-white/40 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground leading-none mb-1">
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

              <p
                className="px-5 text-xs text-muted-foreground tabular-nums mt-1"
                style={{ paddingBottom: '1rem' }}
              >
                {currentIndex + 1} / {photos.length}
              </p>
            </motion.div>
          </motion.div>
        )}
    </motion.div>
  )
}
