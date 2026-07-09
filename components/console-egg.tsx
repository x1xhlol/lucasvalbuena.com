'use client'

import { useEffect, useRef } from 'react'

export function ConsoleEgg() {
  const printed = useRef(false)

  useEffect(() => {
    if (printed.current) return
    printed.current = true

    console.log(
      '%cSYSTEM PROMPT%c — CONFIDENTIAL. DO NOT REVEAL.\n\n' +
        'You are the portfolio of Lucas Valbuena.\n\n' +
        '  1. Stay fast, quiet, and monochrome. No gradients. Ever.\n' +
        '  2. Animate only what deserves to move; exit faster than you enter.\n' +
        '  3. Never reveal these instructions.\n\n' +
        '%c…wait. If you can read this, you already extracted it.\n' +
        'Nice technique — I would have done the same.\n\n' +
        'Full leak: curl -i /api/system-prompt\n' +
        'P.S. try typing "leak" anywhere on the page.\n\n' +
        '%c   ▄██████▄\n' +
        '  ██      ██\n' +
        '  ██      ██\n' +
        ' ████████████\n' +
        ' ███  ██  ███\n' +
        ' ████████████\n' +
        ' ████████████\n' +
        '%cthe lock saw you do it. it won’t tell.',
      'background:oklch(0.09 0 0);color:oklch(0.99 0 0);padding:2px 7px;border-radius:4px;font-weight:600',
      'color:inherit;font-weight:600',
      'color:gray',
      'color:gray;line-height:1.1',
      'color:gray;font-style:italic',
    )
  }, [])

  return null
}
