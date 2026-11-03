import * as React from 'react'

type ViewTransitionProps = {
  children?: React.ReactNode
  name?: string
  share?: string
  default?: string
}

type ReactWithViewTransition = typeof React &
  Partial<
    Record<
      'ViewTransition' | 'unstable_ViewTransition',
      React.ComponentType<ViewTransitionProps>
    >
  >

const impl = React as ReactWithViewTransition

// The App Router runs on React canary, which ships <ViewTransition>, but the
// stable @types/react don't declare it yet. Falls back to a plain passthrough
// when the export is missing so pages still render.
export const ViewTransition: React.ComponentType<ViewTransitionProps> =
  impl.ViewTransition ??
  impl.unstable_ViewTransition ??
  (({ children }) => <>{children}</>)
