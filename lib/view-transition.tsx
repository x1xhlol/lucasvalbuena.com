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

export const ViewTransition: React.ComponentType<ViewTransitionProps> =
  impl.ViewTransition ??
  impl.unstable_ViewTransition ??
  (({ children }) => <>{children}</>)
