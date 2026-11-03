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
  // Only the photo the lightbox opened on morphs from its grid tile; after
  // prev/next the shared element is gone and open/close falls back to fades
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
  // "f/1.7799999713880652" -> "f/1.8"
  const match = raw.match(/f\/([\d.]+)/)
  if (!match) return raw
  const num = parseFloat(match[1])
  return `f/${Math.round(num * 10) / 10}`
}

const MIN_ZOOM = 1
const MAX_ZOOM = 5
const ZOOM_STEP = 0.5
const DOUBLE_CLICK_ZOOM = 2.5
// Dragging past the pan boundary moves the image at a fraction of the pointer
// so the edge is felt as rising resistance, not a hard stop
const OVERSCROLL_RESISTANCE = 0.3
// A committed swipe hands off: the next photo enters from the swipe side and
// keeps the finger's release velocity. Faster flicks start further out so the
// carried velocity is absorbed by distance instead of overshooting center
const SWIPE_ENTER_OFFSET = 24
const SWIPE_MAX_VELOCITY = 2000
const SWIPE_VELOCITY_TO_OFFSET = 1 / 50
// The metadata sheet follows the finger 1:1 and settles with the release
// velocity; a flick past this speed commits regardless of distance
const SHEET_FLICK_VELOCITY = 0.11
// Above the browser's own click slop (~8-15px) so an imprecise tap stays a
// tap for both this handler and the synthetic click
const SHEET_TAP_SLOP = 12
// A gesture's leftover synthetic click lands right after touchend; clicks
// arriving later come from a mouse, keyboard, or assistive tech
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
  // State (not a ref) so releasing the drag re-renders and restores the
  // transform transition for the settle-back
  const [isPanning, setIsPanning] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const panStart = useRef({ x: 0, y: 0 })
  const panBounds = useRef({ x: 0, y: 0 })
  const metadataTouchStart = useRef<{ y: number; t: number; base: number } | null>(null)
  const swipeTouchStart = useRef<{ x: number; y: number; t: number; base: number } | null>(null)
  const swipeIntent = useRef<'horizontal' | 'vertical' | null>(null)
  // The photo tracks the finger 1:1 during a horizontal swipe
  const swipeX = useMotionValue(0)
  // The sheet's vertical offset: 0 when expanded, sheetTravel (the height of
  // everything below the handle) when collapsed
  const sheetY = useMotionValue(0)
  const [sheetTravel, setSheetTravel] = useState(0)
  const sheetTravelRef = useRef(0)
  // 0 expanded → 1 collapsed. Move the content over the fixed safe-area
  // spacer on expansion; no inherited variables or per-frame height changes.
  const sheetCollapseProgress = useTransform(sheetY, (v) => {
    const travel = sheetTravelRef.current
    if (travel <= 0) return 1
    return Math.min(Math.max(v / travel, 0), 1)
  })
  const sheetContentTransform = useTransform(sheetCollapseProgress, (progress) =>
    `translateY(calc(env(safe-area-inset-bottom) * ${progress - 1}))`,
  )
  // Browsers still emit a click for touches under their own tap slop
  // (~8-15px); a committed gesture must swallow that click or it toggles the
  // sheet straight back. Stores the commit time so only the immediate
  // synthetic click is suppressed, never a later keyboard or mouse activation
  const sheetGestureCommittedAtRef = useRef(0)
  const sheetContentRef = useRef<HTMLDivElement>(null)
  const sheetScrollerRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // The unzoomed wrapper: its rect is the image's untransformed position, so
  // zoom math can read it mid-animation without drift
  const wrapperRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const availableFields = METADATA_FIELDS.filter((f) => {
    const val = photo.metadata[f.key]
    return val !== undefined && val !== null && val !== ''
  })
  const hasMetadata = availableFields.length > 0

  // Rapid prev/next presses skip the enter animation — only the first
  // navigation in a burst animates, the rest swap instantly.
  const prevIndexRef = useRef(currentIndex)
  const lastNavTimeRef = useRef(0)
  const rapidNavRef = useRef(false)
  const keyboardNavRef = useRef(false)
  const enteredViaKeyboardRef = useRef(false)
  // Button navigation slides the photo in from the travel direction;
  // keyboard navigation swaps immediately.
  // a committed swipe skips that (swipeX already carries the continuity)
  const gestureNavRef = useRef(false)
  const enteredViaGestureRef = useRef(false)
  // Recorded where the navigation originates (arrows, keys) rather than
  // inferred from the index delta, which is ambiguous with two photos
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

  // Reset zoom/pan on photo change
  useLayoutEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setIsMobileMetadataExpanded(false)
    // The travel-change guard won't fire when the new photo measures the
    // same, so the collapsed position is restored explicitly
    sheetY.jump(sheetTravelRef.current)
  }, [currentIndex, sheetY, setPan, setZoom])

  // Imperative MotionValue springs live outside MotionConfig. A preference
  // change must also settle animations already running when it arrives.
  useLayoutEffect(() => {
    if (!reducedMotion) return
    swipeX.jump(0)
    sheetY.jump(isMobileMetadataExpanded ? 0 : sheetTravel)
  }, [reducedMotion, swipeX, sheetY, isMobileMetadataExpanded, sheetTravel])

  // Zooming hides the sheet; it comes back collapsed after unzoom rather
  // than reappearing expanded
  useEffect(() => {
    if (zoom > 1) {
      setIsMobileMetadataExpanded(false)
      sheetY.jump(sheetTravelRef.current)
    }
  }, [zoom, sheetY])

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

  // How far the scaled image overflows the container on each axis; pan is
  // clamped here so the photo can never be dragged out of reach
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

  // Zoom toward a screen point: the pixel under the cursor stays put.
  // Without a point (toolbar buttons, keyboard) it zooms about the center.
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
        // The transform scales about the image center then offsets by pan. The
        // wrapper isn't transformed by zoom/pan, so its center is the image's
        // untransformed center even while a previous zoom is still animating
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

  // Keyboard
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

  // Dialog focus behavior: focus moves in on open, stays trapped inside, and
  // returns to the gallery tile on close
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
      // Focus can land on body when the focused control unmounts (e.g. Reset
      // zoom); pull it back into the dialog instead of leaking to the page
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

  // Mouse wheel zoom, toward the cursor
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const origin = { x: e.clientX, y: e.clientY }
      if (e.deltaY < 0) zoomIn(origin)
      else zoomOut(origin)
    },
    [zoomIn, zoomOut],
  )

  // Pan via drag when zoomed; past the bounds the image follows at reduced
  // rate (rubber-band) and settles back onto the edge on release
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

  // Double-click to toggle zoom, into the point that was clicked
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (zoom > 1) resetZoom()
      else applyZoom(DOUBLE_CLICK_ZOOM, { x: e.clientX, y: e.clientY })
    },
    [zoom, resetZoom, applyZoom],
  )


  // Measured before paint so the sheet starts collapsed without a flash of
  // the expanded state; ResizeObserver keeps it current across photo changes
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

  // Re-sync the collapsed resting offset only when the measurement itself
  // changes (mount, resize, photo change) — not on expanded→collapsed, which
  // must keep its settle spring alive
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

  // An abandoned gesture (scroll hand-off, system touchcancel) settles the
  // sheet onto whichever rest point is nearer
  const settleSheet = useCallback(() => {
    setSheetExpanded(sheetY.get() < sheetTravel / 2)
  }, [setSheetExpanded, sheetY, sheetTravel])

  const handleMetadataTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const y = e.touches[0]?.clientY
    if (typeof y !== 'number') {
      metadataTouchStart.current = null
      return
    }
    // A drag takes over from any in-flight settle spring
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
      // Drags that belong to the metadata list are ceded to native scrolling:
      // any drag once the list has scrolled off the top, and upward drags
      // while expanded (they scroll the list, not the sheet)
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
      // Beyond either rest point the sheet moves at a fraction of the finger
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
      // A plain tap is handled by the handle button's onClick; the sheet
      // still returns to its rest point in case touchmove nudged it
      if (Math.abs(deltaY) < SHEET_TAP_SLOP) {
        const rest = isMobileMetadataExpanded ? 0 : sheetTravel
        // Animated, not set: a tap that lands mid-settle must not teleport
        if (sheetY.get() !== rest) setSheetExpanded(isMobileMetadataExpanded)
        return
      }

      const velocity = deltaY / Math.max(performance.now() - start.t, 1)
      // A flick commits toward its direction; slower releases settle to the
      // nearest rest point
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
    // A touch takes over swipeX immediately; a still-running handoff spring
    // would otherwise keep writing frames over the finger tracking
    swipeX.stop()
  }, [swipeX])

  // The photo follows the finger 1:1 once the gesture reads as horizontal
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
    // A quick flick counts even when it travels less than the distance threshold
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
      // Didn't commit: spring the photo back under the finger's last position
      if (reducedMotion) swipeX.jump(0)
      else animate(swipeX, 0, { type: 'spring', duration: 0.3, bounce: 0 })
    }

    swipeTouchStart.current = null
    swipeIntent.current = null
  }, [isZoomed, photos.length, onPrev, onNext, swipeX, reducedMotion])

  // System gestures can cancel the touch mid-swipe; spring the photo back so
  // it isn't left stranded off-center
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
        {/* Close */}
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

        {/* Zoom controls, bottom-center of image */}
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

        {/* Prev / Next */}
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

        {/* Main layout: photo + optional side panel */}
        <motion.div
          key={photo.id}
          // No fade when the tile morph is playing (initial open) or during a
          // rapid prev/next burst
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
          // When the tile morph will play the close, an exit fade here would
          // hold the subtree faded-out for 200ms before the shrink-back could
          // start; skipping it lets the grid tile take over immediately while
          // the overlay fades on its own (same shape as the projects morph)
          exit={
            photo.id === morphPhotoId ? undefined : { opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } }
          }
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="h-full flex"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Photo area */}
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
            {/* self-stretch gives the wrapper a definite height so the image's
                max-h-full still resolves (the wrapper itself has no visible box,
                so the morph still reads as landing on the photo) */}
            {/* Swiping and the shared-element morph need separate transforms:
                projection owns the inner transform until the morph detaches. */}
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
                    // A newly keyed photo must never inherit the previous
                    // photo's pan/zoom for even one frame before the reset.
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

          {/* Metadata panel, desktop */}
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

              {/* Counter */}
              <div className="mt-8 pt-5 border-t border-black/[0.08] dark:border-white/[0.08]">
                <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
                  {currentIndex + 1} / {photos.length}
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Mobile metadata sheet */}
        {hasMetadata && !isZoomed && (
          // Entrance fades only: the vertical position belongs to sheetY
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
              // touch-none keeps the browser from hijacking handle drags; the
              // list below keeps native touch so it can scroll
              className="min-h-11 w-full touch-none px-5 pt-3 pb-[0.35rem]"
            >
              <span className="mx-auto mb-2 block h-1 w-12 rounded-full bg-black/25 dark:bg-white/25" />
            </button>

            {/* Fixed safe-area space: content translates over it on expansion,
                leaving the same space below the counter without changing layout. */}
            <div
              aria-hidden
              style={{ height: 'env(safe-area-inset-bottom)' }}
            />

            {/* Everything below the handle is the sheet's travel: collapsing
                translates the sheet down by this region's height, so open and
                close run entirely on the compositor */}
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
