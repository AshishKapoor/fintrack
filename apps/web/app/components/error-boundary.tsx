import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * The last line of defence between a render-time throw and a blank page.
 *
 * Without one, any error thrown while rendering unmounts the entire React tree
 * and the user is left staring at an empty white document with nothing in the
 * UI to explain it or to get them out. That is the worst possible failure mode
 * for an app holding somebody's financial records, and it was reachable from
 * any page.
 *
 * Deliberately a class component: `getDerivedStateFromError` has no hook
 * equivalent, and React still offers no function-component error boundary.
 *
 * This catches render, lifecycle and constructor errors. It does *not* catch
 * errors inside event handlers or async callbacks - those reach
 * `httpPFTClient`'s interceptor (for API calls) or the `unhandledrejection`
 * listener installed in main.tsx.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Self-hosters read container logs; there is no error-reporting service to
    // send this to, and adding one silently would be a privacy decision this
    // project has not made.
    console.error('Unhandled render error:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"
      >
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground max-w-prose text-sm">
          The page failed to render. Your data is safe — this is a display
          problem, not a saving problem. Reloading usually clears it.
        </p>
        <pre className="bg-muted max-w-full overflow-x-auto rounded-md p-3 text-left text-xs">
          {this.state.error.message}
        </pre>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>Reload</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/')}>
            Go to dashboard
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          If it keeps happening,{' '}
          <a
            className="underline underline-offset-4"
            href="https://github.com/AshishKapoor/fintrack/issues/new?template=bug_report.yml"
            target="_blank"
            rel="noreferrer"
          >
            report it
          </a>{' '}
          with the message above.
        </p>
      </div>
    )
  }
}
