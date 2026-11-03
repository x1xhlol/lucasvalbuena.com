'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

// A word (or small glyph) that reveals a live detail in a popover above it.
// Hover intent on desktop (short delay, skipped when another fact was just
// open), tap on touch, focus on keyboard. Dismisses on leave, blur, Escape,
// or a tap outside.

let lastClosedAt = 0
const OPEN_DELAY = 120
const INSTANT_WINDOW = 400

export function Fact({
  children,
  detail,
  label,
  className = '',
}: {
  children: ReactNode
  detail: ReactNode | ((open: boolean) => ReactNode)
  label: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [instant, setInstant] = useState(false)
  const id = useId()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const panel = useRef<HTMLSpanElement>(null)
  const [shift, setShift] = useState(0)

  const show = (delay: number) => {
    clearTimeout(timer.current)
    const skip = Date.now() - lastClosedAt < INSTANT_WINDOW
    setInstant(skip)
    timer.current = setTimeout(() => setOpen(true), skip ? 0 : delay)
  }
  const hide = () => {
    clearTimeout(timer.current)
    setOpen((was) => {
      if (was) lastClosedAt = Date.now()
      return false
    })
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  // Keep the panel inside the viewport with a 12px gutter; the arrow-less
  // card can slide sideways without looking detached
  useEffect(() => {
    if (!open || !panel.current) return
    const rect = panel.current.getBoundingClientRect()
    const gutter = 12
    const overflowRight = rect.right + shift - (window.innerWidth - gutter)
    const overflowLeft = gutter - (rect.left + shift)
    if (overflowRight > 0) setShift(-overflowRight)
    else if (overflowLeft > 0) setShift(overflowLeft)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest(`[data-fact="${id}"]`)) hide()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, id])

  return (
    <span className="relative inline-block" data-fact={id}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onPointerEnter={(e) => e.pointerType === 'mouse' && show(OPEN_DELAY)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && hide()}
        onClick={() => show(0)}
        onFocus={() => show(0)}
        onBlur={hide}
        className={`cursor-default rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 ${className}`}
      >
        {children}
      </button>
      <span
        role="tooltip"
        id={id}
        ref={panel}
        style={{ marginLeft: shift, transformOrigin: `calc(50% - ${shift}px) 100%` }}
        className={`pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-panel text-popover-foreground shadow-panel transition-[opacity,scale,translate,visibility] ease-out motion-reduce:transition-none ${
          open
            ? 'visible translate-y-0 scale-100 opacity-100 duration-150'
            : 'invisible translate-y-1 scale-[0.96] opacity-0 duration-100'
        } ${instant ? 'duration-0' : ''}`}
      >
        {typeof detail === 'function' ? detail(open) : detail}
      </span>
    </span>
  )
}
