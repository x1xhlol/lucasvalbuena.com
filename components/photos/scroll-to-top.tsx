'use client'

import { useEffect } from 'react'

export function ScrollToTop() {
  useEffect(() => {
    const prevScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'

    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }

    // Once now, once on rAF; layout can still jump after hydration.
    scrollToTop()
    const raf = window.requestAnimationFrame(scrollToTop)

    return () => {
      window.cancelAnimationFrame(raf)
      window.history.scrollRestoration = prevScrollRestoration
    }
  }, [])

  return null
}
