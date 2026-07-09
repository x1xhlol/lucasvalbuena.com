'use client'

import { useEffect, useRef } from 'react'

const SCRAMBLE_GLYPHS = '#$%&/<>=+*0123456789ABCDEF'
const TRIGGER = 'leak'
const STEPS = 20
const STEP_MS = 30

export function ScrambleEgg() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let buffer = ''

    const runScramble = () => {
      if (intervalRef.current) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      // Decode left-to-right per heading, not per text node — the hero name is
      // split into one-character spans, which would otherwise resolve instantly
      type Entry = { node: Text; original: string; offset: number; total: number }
      const nodes: Entry[] = []
      document.querySelectorAll('h1, h2, h3').forEach((heading) => {
        const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT)
        const entries: Entry[] = []
        let offset = 0
        let current = walker.nextNode()
        while (current) {
          const text = current as Text
          if (text.nodeValue && text.nodeValue.trim()) {
            entries.push({ node: text, original: text.nodeValue, offset, total: 0 })
            offset += text.nodeValue.length
          }
          current = walker.nextNode()
        }
        entries.forEach((entry) => {
          entry.total = offset
        })
        nodes.push(...entries)
      })
      if (nodes.length === 0) return

      let step = 0
      intervalRef.current = setInterval(() => {
        step++
        const done = step >= STEPS
        nodes.forEach(({ node, original, offset, total }) => {
          if (done) {
            node.nodeValue = original
            return
          }
          const resolved = Math.ceil((step / STEPS) * total)
          node.nodeValue = original
            .split('')
            .map((char, i) =>
              /\s/.test(char) || offset + i < resolved
                ? char
                : SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)],
            )
            .join('')
        })
        if (done) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }, STEP_MS)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key.length !== 1) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      buffer = (buffer + event.key.toLowerCase()).slice(-TRIGGER.length)
      if (buffer === TRIGGER) {
        buffer = ''
        runScramble()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  return null
}
