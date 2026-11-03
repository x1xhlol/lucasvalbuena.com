'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { format } from 'date-fns'
import { ArrowUpRight, Check, Search, X } from 'lucide-react'
import { fuzzyMatch } from '@/lib/fuzzy'
import { ASK_ENABLED, MAX_QUESTION_LENGTH } from '@/lib/ask/protocol'

const EMAIL = 'lucasvalbuena@pm.me'

const OPEN_EVENT = 'open-command-palette'

// Anything with a search box or a keyboard trigger can open the palette
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

type PaletteGroup = 'Pages' | 'Sections' | 'Writing' | 'Actions' | 'Theme' | 'Ask'

const GROUP_ORDER: Record<PaletteGroup, number> = { Pages: 0, Sections: 1, Writing: 2, Actions: 3, Theme: 4, Ask: 5 }

interface PaletteItem {
  id: string
  label: string
  group: PaletteGroup
  // Quiet trailing detail: a path, anchor, date, or handle
  meta?: string
  // Footer verb for what Enter does on this row
  verb: string
  // Extra strings the query also matches against (e.g. "dark" for theme)
  keywords?: string
  external?: boolean
  // Marks the option reflecting current state (e.g. the active theme)
  current?: boolean
  perform: () => void | Promise<'copied'>
}

interface PostEntry {
  title: string
  slug: string
  publishedAt?: string | null
}

function HighlightedLabel({ label, indices }: { label: string; indices: number[] }) {
  if (indices.length === 0) return <>{label}</>
  const set = new Set(indices)
  return (
    <>
      {label.split('').map((char, i) =>
        set.has(i) ? (
          <span
            key={i}
            className="text-foreground underline decoration-muted-foreground/65 underline-offset-[3px]"
          >
            {char}
          </span>
        ) : (
          <span key={i}>{char}</span>
        ),
      )}
    </>
  )
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [posts, setPosts] = useState<PostEntry[] | null>(null)
  const [postsFailed, setPostsFailed] = useState(false)
  const [isCoarsePointer, setIsCoarsePointer] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openedByKeyboardRef = useRef(false)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const runningItemRef = useRef(false)
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setIsCoarsePointer(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (!document.querySelector('[data-command-palette]')) {
          returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        }
        openedByKeyboardRef.current = true
        setOpen((prev) => !prev)
      }
    }
    const onOpen = () => {
      openedByKeyboardRef.current = false
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener(OPEN_EVENT, onOpen)
    }
  }, [])

  // Posts load once, on first open, so the shortcut stays instant
  useEffect(() => {
    if (!open || posts !== null) return
    let cancelled = false
    setPostsFailed(false)
    fetch('/api/palette')
      .then((res) => {
        if (!res.ok) throw new Error('Posts could not be loaded')
        return res.json()
      })
      .then((data: { posts?: PostEntry[] }) => {
        if (!cancelled) setPosts(data.posts ?? [])
      })
      .catch(() => {
        if (!cancelled) {
          setPosts([])
          setPostsFailed(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, posts])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setCopiedId(null)
      setActionError('')
      if (copyResetTimerRef.current) {
        clearTimeout(copyResetTimerRef.current)
        copyResetTimerRef.current = null
      }
    }
  }, [open])

  const close = useCallback(() => setOpen(false), [])

  const navigate = useCallback(
    (href: string) => {
      close()
      router.push(href)
    },
    [close, router],
  )

  const goToSection = useCallback(
    (anchor: string) => {
      close()
      if (pathname === '/') {
        document.getElementById(anchor)?.scrollIntoView({
          behavior: openedByKeyboardRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
        })
      } else {
        router.push(`/#${anchor}`)
      }
    },
    [close, pathname, router],
  )

  const items = useMemo<PaletteItem[]>(() => {
    const onPage = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))
    const pages: PaletteItem[] = [
      { id: 'page-home', label: 'Home', group: 'Pages', meta: '/', verb: 'Open', keywords: 'index about', current: onPage('/'), perform: () => navigate('/') },
      { id: 'page-blog', label: 'Writing', group: 'Pages', meta: '/blog', verb: 'Open', keywords: 'blog posts', current: onPage('/blog'), perform: () => navigate('/blog') },
      { id: 'page-photos', label: 'Photos', group: 'Pages', meta: '/photos', verb: 'Open', keywords: 'photography gallery', current: onPage('/photos'), perform: () => navigate('/photos') },
      ...(ASK_ENABLED
        ? [{ id: 'page-ask', label: 'Ask', group: 'Pages' as const, meta: '/ask', verb: 'Open', keywords: 'question ai agent chat claude', current: onPage('/ask'), perform: () => navigate('/ask') }]
        : []),
    ]
    const sections: PaletteItem[] = [
      { id: 'section-experience', label: 'Experience', group: 'Sections', meta: '#experience', verb: 'Jump to', keywords: 'work orchid zeroleaks', perform: () => goToSection('experience') },
      { id: 'section-projects', label: 'Projects', group: 'Sections', meta: '#projects', verb: 'Jump to', keywords: 'system prompts zeroleaks pare', perform: () => goToSection('projects') },
      { id: 'section-contact', label: 'Contact', group: 'Sections', meta: '#contact', verb: 'Jump to', keywords: 'email', perform: () => goToSection('contact') },
    ]
    const postItems: PaletteItem[] = (posts ?? []).map((post) => ({
      id: `post-${post.slug}`,
      label: post.title,
      group: 'Writing' as const,
      meta: post.publishedAt ? format(new Date(post.publishedAt), 'MMM yyyy') : undefined,
      verb: 'Read',
      current: pathname === `/blog/${post.slug}`,
      perform: () => navigate(`/blog/${post.slug}`),
    }))
    const actions: PaletteItem[] = [
      {
        id: 'action-copy-email',
        label: 'Copy email',
        group: 'Actions',
        meta: EMAIL,
        verb: 'Copy',
        keywords: 'contact mail',
        perform: async () => {
          await navigator.clipboard.writeText(EMAIL)
          return 'copied' as const
        },
      },
      {
        id: 'action-copy-link',
        label: 'Copy page link',
        group: 'Actions',
        meta: pathname,
        verb: 'Copy',
        keywords: 'url share',
        perform: async () => {
          await navigator.clipboard.writeText(window.location.href)
          return 'copied' as const
        },
      },
      {
        id: 'action-github',
        label: 'GitHub',
        group: 'Actions',
        meta: '@x1xhlol',
        verb: 'Open in new tab',
        keywords: 'code profile source',
        external: true,
        perform: () => { window.open('https://github.com/x1xhlol', '_blank', 'noopener,noreferrer') },
      },
    ]
    const themes: PaletteItem[] = [
      { id: 'action-theme-light', label: 'Light', group: 'Theme', verb: 'Switch theme', keywords: 'theme appearance mode', current: theme === 'light', perform: () => setTheme('light') },
      { id: 'action-theme-dark', label: 'Dark', group: 'Theme', verb: 'Switch theme', keywords: 'theme appearance mode', current: theme === 'dark', perform: () => setTheme('dark') },
      { id: 'action-theme-system', label: 'System', group: 'Theme', verb: 'Switch theme', keywords: 'theme appearance mode auto', current: theme === 'system', perform: () => setTheme('system') },
    ]

    return [...pages, ...sections, ...postItems, ...actions, ...themes]
  }, [posts, navigate, goToSection, theme, setTheme, pathname])

  const results = useMemo(() => {
    if (query.trim() === '') {
      return items.map((item) => ({ item, indices: [] as number[] }))
    }
    // Groups rank by their best match so the top hit leads the list, and rows
    // stay contiguous per group so each header renders exactly once
    const matches = items
      .map((item) => {
        const labelMatch = fuzzyMatch(query.trim(), item.label)
        if (labelMatch) return { item, indices: labelMatch.indices, score: labelMatch.score }
        const extra = [item.keywords, item.meta].filter(Boolean).join(' ')
        if (extra && fuzzyMatch(query.trim(), extra)) {
          return { item, indices: [] as number[], score: -100 }
        }
        return null
      })
      .filter((r) => r !== null)
    const bestInGroup = new Map<PaletteGroup, number>()
    for (const m of matches) {
      bestInGroup.set(m.item.group, Math.max(bestInGroup.get(m.item.group) ?? -Infinity, m.score))
    }
    const sorted = matches.sort(
      (a, b) =>
        bestInGroup.get(b.item.group)! - bestInGroup.get(a.item.group)! ||
        GROUP_ORDER[a.item.group] - GROUP_ORDER[b.item.group] ||
        b.score - a.score,
    )
    if (!ASK_ENABLED) return sorted
    // Any typed query can also go to the Ask page as a question, which keeps
    // a search with no matches from being a dead end
    const question = query.trim().slice(0, MAX_QUESTION_LENGTH)
    const askItem: PaletteItem = {
      id: 'ask-query',
      label: `Ask “${question}”`,
      group: 'Ask',
      meta: '/ask',
      verb: 'Ask',
      perform: () => navigate(`/ask?q=${encodeURIComponent(question)}`),
    }
    return [...sorted, { item: askItem, indices: [] as number[] }]
  }, [items, query, navigate])

  // Highlight tracks the best match while typing; arrow keys and pointer
  // moves take over between keystrokes
  useEffect(() => {
    setActiveId(results[0]?.item.id ?? null)
  }, [query, open])

  // Keep the highlight valid when results change under a stable query
  // (e.g. posts finish loading)
  useEffect(() => {
    if (!results.some((r) => r.item.id === activeId)) {
      setActiveId(results[0]?.item.id ?? null)
    }
  }, [results, activeId])

  const runItem = useCallback(
    async (item: PaletteItem) => {
      if (runningItemRef.current) return
      runningItemRef.current = true
      setActionError('')
      try {
        const performed = item.perform()
        if (!performed) return
        setPendingId(item.id)
        const outcome = await performed
        if (outcome === 'copied') {
          setCopiedId(item.id)
          if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current)
          copyResetTimerRef.current = setTimeout(() => setCopiedId(null), 1500)
        }
      } catch {
        setCopiedId(null)
        setActionError(`Could not copy. Select and copy the address: ${EMAIL}`)
      } finally {
        runningItemRef.current = false
        setPendingId(null)
      }
    },
    [],
  )

  const moveActive = useCallback(
    (delta: number) => {
      if (results.length === 0) return
      const currentIndex = results.findIndex((r) => r.item.id === activeId)
      const next = (currentIndex + delta + results.length) % results.length
      const id = results[next].item.id
      setActiveId(id)
      listRef.current
        ?.querySelector(`[data-item-id="${CSS.escape(id)}"]`)
        ?.scrollIntoView({ block: 'nearest' })
    },
    [results, activeId],
  )

  // A tapped row can hold DOM focus while the highlight moves by any route
  // (arrows, hover, results changing). Reclaiming list focus whenever the
  // highlight changes keeps native Enter/Space activation on the highlighted
  // row rather than a stale focused one
  useEffect(() => {
    const list = listRef.current
    if (list && document.activeElement !== list && list.contains(document.activeElement)) {
      list.focus()
    }
  }, [activeId])

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        moveActive(1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        moveActive(-1)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const active = results.find((r) => r.item.id === activeId)
        if (active) runItem(active.item)
      }
    },
    [moveActive, results, activeId, runItem],
  )

  // The list container holds focus when the palette opens by tap, so a
  // hardware keyboard still works from there: arrows/Enter drive the list
  // directly and typing hands the keystroke to the search field
  const onListKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // A row button can hold DOM focus after a touch tap; Enter/Space on it
      // activate natively as a click, which runs that exact row
      const onRowButton =
        e.target instanceof HTMLElement && e.target.closest('[data-item-id]') !== null
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || (e.key === 'Enter' && !onRowButton)) {
        onInputKeyDown(e)
        return
      }
      if (onRowButton && (e.key === 'Enter' || e.key === ' ')) return
      // AltGr composes a printable character; the dedicated modifier state
      // covers Windows/Linux (ctrl+alt) and macOS Option without swallowing
      // plain Ctrl/Meta/Alt chords
      const altGraph = e.getModifierState('AltGraph')
      if (
        e.key === 'Backspace' ||
        (e.key.length === 1 && !e.metaKey && (altGraph || (!e.ctrlKey && !e.altKey)))
      ) {
        e.preventDefault()
        inputRef.current?.focus()
        if (e.key === 'Backspace') {
          setQuery((q) => q.slice(0, -1))
        } else if (!(e.key === ' ' && query === '')) {
          setQuery((q) => q + e.key)
        }
      }
    },
    [onInputKeyDown, query],
  )

  // Rows are flat for keyboard order; group headers render between them
  let lastGroup: string | null = null

  const activeItem = results.find((r) => r.item.id === activeId)?.item
  const kbd = 'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border/70 px-1 font-mono text-[11px] leading-none text-muted-foreground'

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        {/* Opened from a shortcut many times a day, so it appears instantly */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] reduce-transparency:backdrop-blur-none" />
        <DialogPrimitive.Content
          data-command-palette
          aria-describedby={undefined}
          // On touch the palette doubles as the nav menu: opened by tap it
          // starts browsable — focus lands on the list, not the input, so the
          // soft keyboard only comes up if the field itself is tapped. Opened
          // by shortcut (a hardware keyboard exists) the input focuses as usual
          onOpenAutoFocus={(e) => {
            if (isCoarsePointer && !openedByKeyboardRef.current) {
              e.preventDefault()
              listRef.current?.focus()
            }
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus({ preventScroll: true })
          }}
          className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] sm:top-[16dvh] z-50 flex max-h-[calc(100dvh-2rem)] sm:max-h-[70dvh] w-[calc(100%-2rem)] max-w-[34rem] -translate-x-1/2 flex-col overflow-hidden rounded-[20px] border border-border/60 bg-background shadow-overlay outline-none"
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
          <div className="relative flex shrink-0 items-center gap-2 border-b border-border/70 pl-5 pr-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <label htmlFor="palette-search" className="sr-only">Search pages, posts, and actions</label>
            <input
              id="palette-search"
              ref={inputRef}
              autoComplete="off"
              spellCheck={false}
              data-1p-ignore
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Where to?"
              role="combobox"
              aria-expanded
              aria-controls="palette-listbox"
              aria-activedescendant={activeId ? `palette-item-${activeId}` : undefined}
              aria-autocomplete="list"
              className="h-14 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:outline-none"
            />
            <DialogPrimitive.Close
              aria-label="Close command palette"
              className="touch-target relative inline-flex h-9 shrink-0 items-center justify-center rounded-lg px-2 text-muted-foreground transition-colors duration-150 hover:bg-muted/60 hover:text-foreground"
            >
              <kbd className={`${kbd} hidden pointer-fine:inline-flex`}>esc</kbd>
              <X className="size-4 pointer-fine:hidden" aria-hidden />
            </DialogPrimitive.Close>
          </div>

          <div
            ref={listRef}
            id="palette-listbox"
            role="listbox"
            aria-label="Commands"
            // Duplicated from the input: whichever of the two holds DOM focus
            // must expose the highlighted option to assistive tech
            aria-activedescendant={activeId ? `palette-item-${activeId}` : undefined}
            tabIndex={-1}
            onKeyDown={onListKeyDown}
            className="palette-scrollbar min-h-0 max-h-[min(62dvh,28rem)] overflow-y-auto overscroll-contain px-2 pb-2 outline-none sm:max-h-[min(48dvh,24rem)]"
          >
            {results.map(({ item, indices }) => {
              const header =
                item.group !== lastGroup ? (
                  <p
                    key={`header-${item.group}`}
                    aria-hidden
                    className="px-3 pb-1 pt-4 text-xs font-medium text-muted-foreground/80"
                  >
                    {item.group}
                  </p>
                ) : null
              lastGroup = item.group
              const isActive = item.id === activeId
              const isCopied = item.id === copiedId
              const isPending = item.id === pendingId
              return (
                <div key={item.id}>
                  {header}
                  <button
                    type="button"
                    id={`palette-item-${item.id}`}
                    data-item-id={item.id}
                    role="option"
                    aria-selected={isActive}
                    aria-busy={isPending}
                    aria-current={item.current || undefined}
                    tabIndex={-1}
                    onPointerMove={() => setActiveId(item.id)}
                    // Focus stays in the search box so the keyboard keeps
                    // driving the list when an action leaves the palette open.
                    // Touch keeps the default sequence: some WebKit builds
                    // drop the synthesized click when pointerdown is cancelled
                    onPointerDown={(e) => {
                      if (e.pointerType !== 'touch') e.preventDefault()
                    }}
                    // Also sync the highlight: a tap can leave DOM focus on
                    // this row while the palette stays open, and Enter/Space
                    // activate the focused row natively
                    onClick={() => {
                      setActiveId(item.id)
                      runItem(item)
                    }}
                    className="group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium text-muted-foreground outline-none aria-selected:bg-muted/60 aria-selected:text-foreground active:bg-muted sm:min-h-10 sm:py-2 sm:text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {isPending ? 'Copying…' : isCopied ? 'Copied' : <HighlightedLabel label={item.label} indices={indices} />}
                    </span>
                    {item.current && !isCopied && (
                      <span className="shrink-0 text-xs font-normal text-muted-foreground">
                        {item.group === 'Theme' ? 'Active' : 'Current'}
                      </span>
                    )}
                    {item.meta && !item.current && !isCopied && (
                      <span className="max-w-[45%] shrink-0 truncate font-mono text-xs font-normal tabular-nums text-muted-foreground/70 group-aria-selected:text-muted-foreground">
                        {item.meta}
                      </span>
                    )}
                    {isCopied && <Check className="h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden />}
                    {item.external && (
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-150 ease-out group-aria-selected:text-muted-foreground motion-safe:pointer-fine:group-aria-selected:-translate-y-0.5 motion-safe:pointer-fine:group-aria-selected:translate-x-0.5" aria-hidden />
                    )}
                  </button>
                </div>
              )
            })}
          </div>

          {actionError && <p role="alert" className="shrink-0 break-words border-t border-border/70 px-5 py-3 text-sm text-destructive">{actionError}</p>}
          <span className="sr-only" role="status">{copiedId ? 'Copied to clipboard' : ''}</span>
          {postsFailed && (
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/70 px-5 text-sm text-muted-foreground">
              <p>Posts could not be loaded.</p>
              <button type="button" onClick={() => setPosts(null)} className="min-h-11 text-foreground underline decoration-muted-foreground/65 underline-offset-[5px] transition-[text-decoration-color] duration-150 hover:decoration-foreground">Retry</button>
            </div>
          )}
          <div className="hidden h-11 shrink-0 items-center gap-4 border-t border-border/70 px-5 text-xs text-muted-foreground pointer-fine:flex">
            <span className="flex items-center gap-1.5">
              <span className="flex gap-0.5">
                <kbd className={kbd}>↑</kbd>
                <kbd className={kbd}>↓</kbd>
              </span>
              Navigate
            </span>
            {activeItem && (
              <span className="ml-auto flex min-w-0 items-center gap-1.5">
                <span className="truncate text-foreground">{activeItem.verb}</span>
                <kbd className={kbd}>↵</kbd>
              </span>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
