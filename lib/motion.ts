// motion/react mirror of the CSS motion tokens in app/globals.css
// (--ease-out / --ease-in-out). Keep both in sync so JS-driven and CSS-driven
// animations share one curve.
export const EASE_OUT = [0.23, 1, 0.32, 1] as const
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const

// Shared spring vocabulary (perceptual duration/bounce form).
// MORPH: shared-element morphs (project row -> panel, photo tile -> lightbox).
// SWAP: small state swaps (copied badge, icon changes).
export const SPRING_MORPH = { type: 'spring', duration: 0.45, bounce: 0.15 } as const
export const SPRING_SWAP = { type: 'spring', duration: 0.35, bounce: 0.15 } as const
