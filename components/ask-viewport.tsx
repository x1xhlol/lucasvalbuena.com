'use client'

import { useEffect } from 'react'

const KEYBOARD_MIN_PX = 120

export function AskViewport() {
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const root = document.documentElement

    const clear = () => {
      root.style.removeProperty('--ask-height')
      root.style.removeProperty('--ask-offset')
      root.removeAttribute('data-keyboard')
    }

    const update = () => {
      if (Math.abs(viewport.scale - 1) > 0.01) {
        clear()
        return
      }
      root.style.setProperty('--ask-height', `${viewport.height}px`)
      root.style.setProperty('--ask-offset', `${viewport.offsetTop}px`)
      root.toggleAttribute('data-keyboard', window.innerHeight - viewport.height > KEYBOARD_MIN_PX)
    }

    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      clear()
    }
  }, [])

  return null
}
