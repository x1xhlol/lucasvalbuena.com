'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { PixelLockSprite, type LockFrame } from '@/components/pixel-lock'
import { useMediaQuery } from '@/hooks/use-media-query'
import { EASE_OUT, SPRING_MORPH, SPRING_SWAP } from '@/lib/motion'
import { normalizeEmail, type NewsletterErrorCode } from '@/lib/newsletter/config'

type State =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; email: string }
  | { kind: 'subscribed' }
  | { kind: 'error'; message: string }

const ERRORS: Record<NewsletterErrorCode | 'network', string> = {
  invalid_email: "That doesn't look like an email address.",
  unavailable: 'Email signup is off for now.',
  failed: "The confirmation email didn't go out. Try again in a moment.",
  network: "Couldn't reach the site. Check your connection and try again.",
}

// The same stand-ins the hero name scrambles through
const GLYPHS = 'acenorsuvxz*+=<>'
const DECODE_TICK_MS = 38

// Text that resolves out of scrambled glyphs from left to right, like the
// name in the hero. Screen readers get the plain text straight away.
function Decode({ text, reducedMotion }: { text: string; reducedMotion: boolean }) {
  const [shown, setShown] = useState(reducedMotion ? text : '')
  useEffect(() => {
    if (reducedMotion) {
      setShown(text)
      return
    }
    const duration = 380 + text.length * 14
    const start = performance.now()
    let last = 0
    let raf = requestAnimationFrame(function tick(now) {
      if (now - last >= DECODE_TICK_MS) {
        last = now
        const revealed = Math.floor(Math.min(1, (now - start) / duration) * text.length)
        setShown(
          text
            .split('')
            .map((char, i) => (i < revealed || char === ' ' ? char : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
            .join(''),
        )
      }
      if (now - start < duration) raf = requestAnimationFrame(tick)
      else setShown(text)
    })
    return () => cancelAnimationFrame(raf)
  }, [text, reducedMotion])
  return (
    <>
      <span aria-hidden>{shown}</span>
      <span className="sr-only">{text}</span>
    </>
  )
}

type Mood = 'idle' | 'looking' | 'valid' | 'thinking' | 'nope' | 'done'

// The footer lock's moves, smaller: it watches you type, perks up at a
// real-looking address, glances around while sending, shakes its head at a
// failure, and hops and winks when the email is on its way
function useLock(reducedMotion: boolean) {
  const [scope, animate] = useAnimate<HTMLSpanElement>()
  const [frame, setFrame] = useState<LockFrame>('idle')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const mood = useRef<Mood>('idle')

  const clear = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  const sequence = (steps: Array<[LockFrame, number]>, then?: LockFrame, loop = false) => {
    clear()
    let at = 0
    const run = () => {
      at = 0
      for (const [step, hold] of steps) {
        timers.current.push(setTimeout(() => setFrame(step), at))
        at += hold
      }
      if (loop) timers.current.push(setTimeout(run, at))
      else if (then) timers.current.push(setTimeout(() => setFrame(then), at))
    }
    run()
  }

  const set = useCallback(
    (next: Mood) => {
      if (mood.current === next && next !== 'nope') return
      mood.current = next
      const move = (keyframes: Record<string, number[]>, duration: number) => {
        if (!reducedMotion && scope.current) animate(scope.current, keyframes, { duration, ease: EASE_OUT })
      }
      switch (next) {
        case 'idle':
          clear()
          setFrame('idle')
          break
        case 'looking':
          clear()
          setFrame('right')
          break
        case 'valid':
          clear()
          setFrame('happy')
          move({ y: [0, -2, 0] }, 0.25)
          break
        case 'thinking':
          sequence([['left', 260], ['idle', 100], ['right', 260], ['idle', 100]], undefined, true)
          break
        case 'nope':
          sequence([['left', 110], ['right', 110], ['left', 110]], 'idle')
          move({ rotate: [0, -14, 12, -8, 5, 0] }, 0.5)
          break
        case 'done':
          sequence([['happy', 260], ['winkLeft', 520]], 'happy')
          move({ y: [0, -6, 0] }, 0.38)
          break
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [animate, reducedMotion],
  )

  // A blink now and then while nothing is happening
  useEffect(() => {
    const id = setInterval(() => {
      if (mood.current !== 'idle' || document.hidden) return
      setFrame('blink')
      timers.current.push(setTimeout(() => mood.current === 'idle' && setFrame('idle'), 150))
    }, 4600)
    return () => {
      clearInterval(id)
      clear()
    }
  }, [])

  return { scope, frame, set }
}

// "New posts by email". The address goes to /api/newsletter, which emails a
// confirmation link; nothing is stored until that link is confirmed.
//
// A pill in the Ask composer's language, with the site's pixel lock living at
// its left end. When the signup goes through, the Subscribe button stretches
// across the pill and becomes the confirmation, decoding in like the hero
// name. `compact` is the quiet version for the home page's Writing section:
// no heading (the placeholder says it), a smaller pill, and a soft button
// instead of a solid one, so it sits beside "View all posts" without
// competing with the posts.
export function NewsletterForm({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  const id = useId()
  const inputId = `${id}-email`
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>({ kind: 'idle' })
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const lock = useLock(reducedMotion)
  const [pillScope, animatePill] = useAnimate<HTMLDivElement>()
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [focused, setFocused] = useState(false)

  // The confirmation page sends people back with ?subscribed=1
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('subscribed') !== '1') return
    setState({ kind: 'subscribed' })
    lock.set('done')
    url.searchParams.delete('subscribed')
    window.history.replaceState(window.history.state, '', url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => clearTimeout(typingTimer.current), [])

  const fail = (message: string) => {
    setState({ kind: 'error', message })
    lock.set('nope')
    if (!reducedMotion && pillScope.current) {
      animatePill(pillScope.current, { x: [0, -6, 5, -3, 2, 0] }, { duration: 0.4, ease: EASE_OUT })
    }
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (state.kind === 'sending') return
    if (!normalizeEmail(email)) {
      fail(ERRORS.invalid_email)
      return
    }
    const company = new FormData(event.currentTarget).get('company')
    setState({ kind: 'sending' })
    lock.set('thinking')
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, company }),
      })
      if (response.ok) {
        setState({ kind: 'sent', email: email.trim() })
        lock.set('done')
        return
      }
      const body = (await response.json().catch(() => null)) as { error?: NewsletterErrorCode } | null
      fail(ERRORS[body?.error ?? 'failed'] ?? ERRORS.failed)
    } catch {
      fail(ERRORS.network)
    }
  }

  const onType = (value: string) => {
    setEmail(value)
    if (state.kind === 'error') setState({ kind: 'idle' })
    clearTimeout(typingTimer.current)
    if (normalizeEmail(value)) {
      lock.set('valid')
      return
    }
    lock.set(value ? 'looking' : 'idle')
    typingTimer.current = setTimeout(() => lock.set('idle'), 900)
  }

  const done = state.kind === 'sent' || state.kind === 'subscribed'
  const sending = state.kind === 'sending'
  const showLock = focused || email !== '' || state.kind !== 'idle'
  // After a signup the pill itself says "check your inbox", so the line
  // above stays as it was
  const hint =
    state.kind === 'subscribed'
      ? 'New posts will land in your inbox. Every email has an unsubscribe link.'
      : 'One short email per post. Unsubscribe anytime.'

  return (
    <section id="newsletter" aria-labelledby={`${id}-title`} className={`scroll-mt-24 ${className}`}>
      {compact ? (
        <label id={`${id}-title`} htmlFor={inputId} className="sr-only">
          Email address for new posts
        </label>
      ) : (
        <>
          <h2 id={`${id}-title`} className="text-base font-medium text-foreground">
            <label htmlFor={inputId}>Get new posts by email</label>
          </h2>
          <p id={hintId} className="mt-0.5 text-base text-muted-foreground text-pretty" aria-live="polite">
            {hint}
          </p>
        </>
      )}

      <form onSubmit={submit} noValidate className={compact ? '' : 'mt-4'}>
        {/* Hidden from people, irresistible to bots */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Company
            <input type="text" name="company" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <div
          ref={pillScope}
          className={`relative flex items-center gap-1 rounded-full bg-background shadow-raised transition-shadow duration-150 ${
            // The 1px ring is drawn outside the box, so the compact pill steps in
            // by 1px a side to put its visible edge exactly on the column's
            compact ? 'mx-px h-10 w-[calc(100%-2px)] p-1' : 'h-12 w-full p-1.5 sm:max-w-sm'
          } ${
            state.kind === 'error' ? 'ring-1 ring-destructive' : 'focus-within:ring-1 focus-within:ring-input'
          }`}
        >
          {/* The lock isn't there until you click in. It pops in at the
              pill's left end, stays while there's something to watch, and
              tucks itself away again if you leave the field empty. */}
          <AnimatePresence initial={false}>
            {showLock && (
              <motion.span
                key="lock"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 32, opacity: 1 }}
                exit={{ width: 0, opacity: 0, transition: reducedMotion ? { duration: 0 } : { duration: 0.18, ease: EASE_OUT } }}
                transition={reducedMotion ? { duration: 0 } : SPRING_SWAP}
                className={`flex shrink-0 cursor-text items-center justify-center overflow-hidden text-foreground ${compact ? 'h-8' : 'h-9'}`}
                onClick={() => !done && document.getElementById(inputId)?.focus()}
              >
                <motion.span
                  initial={{ scale: 0.4, y: 8, rotate: -14 }}
                  animate={{ scale: 1, y: 0, rotate: 0 }}
                  exit={{ scale: 0.6, y: 4 }}
                  transition={{ type: 'spring', duration: 0.5, bounce: 0.4 }}
                  className="inline-flex"
                >
                  <span ref={lock.scope} className="inline-flex">
                    {/* 24px is three screen pixels per lock pixel on a retina display */}
                    <PixelLockSprite frame={lock.frame} size={24} />
                  </span>
                </motion.span>
              </motion.span>
            )}
          </AnimatePresence>

          <AnimatePresence mode="popLayout" initial={false}>
            {!done && (
              <motion.div
                key="field"
                className="flex min-w-0 flex-1"
                exit={{ opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } }}
              >
                <input
                  id={inputId}
                  data-pill-input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="send"
                  placeholder={compact ? 'Get new posts by email' : 'you@example.com'}
                  value={email}
                  onChange={(event) => onType(event.target.value)}
                  onFocus={() => {
                    setFocused(true)
                    // Arrives looking at the field, then settles
                    if (normalizeEmail(email)) lock.set('valid')
                    else {
                      lock.set('looking')
                      clearTimeout(typingTimer.current)
                      typingTimer.current = setTimeout(() => lock.set('idle'), 900)
                    }
                  }}
                  onBlur={() => {
                    setFocused(false)
                    if (!normalizeEmail(email) && state.kind !== 'error') lock.set('idle')
                  }}
                  readOnly={sending}
                  aria-describedby={[compact ? null : hintId, state.kind === 'error' ? errorId : null].filter(Boolean).join(' ') || undefined}
                  aria-invalid={state.kind === 'error' || undefined}
                  className={`min-w-0 flex-1 bg-transparent pr-2 text-base text-foreground outline-none placeholder:text-muted-foreground read-only:text-muted-foreground ${
                    compact ? 'h-8 pl-3' : 'h-9 pl-2.5'
                  }`}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* The button stays mounted and stretches across the pill when the
              signup goes through, turning into the confirmation */}
          <motion.div
            layout
            transition={SPRING_MORPH}
            style={{ borderRadius: 999 }}
            className={`relative flex items-center overflow-hidden transition-colors duration-200 ease-out ${compact ? 'h-8' : 'h-9'} ${
              // The quiet version's button is soft until the signup goes
              // through; the confirmation is solid everywhere
              compact && !done ? 'bg-muted text-foreground hover:bg-border' : 'bg-primary text-primary-foreground'
            } ${done ? 'min-w-0 flex-1' : 'shrink-0'}`}
          >
            {done ? (
              <motion.p
                layout="position"
                role="status"
                className={`min-w-0 truncate px-4 font-geist-pixel lowercase ${compact ? 'text-sm' : 'text-[15px]'}`}
              >
                <Decode
                  text={state.kind === 'sent' ? 'check your inbox' : "you're subscribed"}
                  reducedMotion={reducedMotion}
                />
              </motion.p>
            ) : (
              <motion.button
                layout="position"
                type="submit"
                disabled={sending}
                className={`${compact ? 'h-8 px-3.5' : 'h-9 px-4'} cursor-pointer text-sm font-medium transition-[opacity,scale] duration-150 ease-out motion-safe:active:scale-[0.97] disabled:cursor-default`}
              >
                <span className="relative inline-flex items-center">
                  <span className={sending ? 'opacity-0' : ''}>Subscribe</span>
                  {sending && (
                    <span aria-hidden className="absolute inset-0 flex items-center justify-center gap-1">
                      {[0, 1, 2].map((dot) => (
                        <span
                          key={dot}
                          className="ask-dot size-1 rounded-full bg-current"
                          style={{ animationDelay: `${dot * 0.15}s` }}
                        />
                      ))}
                    </span>
                  )}
                  {sending && <span className="sr-only">Sending</span>}
                </span>
              </motion.button>
            )}
          </motion.div>
        </div>

        {state.kind === 'error' && (
          <p id={errorId} role="alert" className="mt-2 pl-1 text-sm text-destructive">
            {state.message}
          </p>
        )}
        {compact && state.kind === 'subscribed' && (
          <p className="mt-2 pl-1 text-sm text-muted-foreground" aria-live="polite">
            {hint}
          </p>
        )}
      </form>
    </section>
  )
}
