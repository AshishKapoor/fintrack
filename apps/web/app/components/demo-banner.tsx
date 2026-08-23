'use client'

import { fetchDemoStatus, type DemoStatus } from '@/lib/demo'
import { useEffect, useState } from 'react'

/** Renders nothing on a normal instance - only a truthy /healthz/ demo flag shows this. */
export function DemoBanner() {
  const [status, setStatus] = useState<DemoStatus | null>(null)

  useEffect(() => {
    void fetchDemoStatus().then(setStatus)
  }, [])

  if (!status?.demo) return null

  return (
    <div className='flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950'>
      <span>
        You are viewing a public FinTrack demo
        {status.demoEmail ? (
          <>
            {' '}
            — sign in with <strong>{status.demoEmail}</strong>
          </>
        ) : null}
        . Data resets hourly; nothing you do here is saved.
      </span>
      <a
        href='https://github.com/AshishKapoor/fintrack'
        target='_blank'
        rel='noreferrer'
        className='whitespace-nowrap underline underline-offset-2'
      >
        Self-host your own →
      </a>
    </div>
  )
}
