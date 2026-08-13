'use client'

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pin, Play } from 'lucide-react'
import { toast } from 'sonner'

import { listSavedReports, runSavedReport, type SavedReport } from '@/lib/finance-client'
import { Button } from '@/components/ui/button'

export function PinnedReports() {
  const [reports, setReports] = useState<SavedReport[]>([])
  const [runningId, setRunningId] = useState<number | null>(null)

  useEffect(() => {
    let canceled = false

    const load = async () => {
      try {
        const rows = await listSavedReports({ pinned: true })
        if (!canceled) setReports(rows)
      } catch {
        if (!canceled) toast.error('Failed to load pinned reports')
      }
    }

    void load()
    return () => {
      canceled = true
    }
  }, [])

  if (!reports.length) {
    return (
      <div className='space-y-2'>
        <p className='text-sm text-muted-foreground'>No pinned reports yet.</p>
        <Link to='/reports'>
          <Button variant='outline' size='sm'>
            Open Reports
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className='space-y-2'>
      {reports.map((report) => (
        <div key={report.id} className='flex items-center justify-between rounded-md border p-2'>
          <div className='flex items-center gap-2'>
            <Pin className='h-3 w-3 text-amber-600' />
            <span className='text-sm font-medium'>{report.name}</span>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              size='sm'
              variant='outline'
              disabled={runningId === report.id}
              onClick={async () => {
                try {
                  setRunningId(report.id)
                  await runSavedReport(report.id)
                  toast.success(`Ran ${report.name}`)
                } catch {
                  toast.error('Failed to run report')
                } finally {
                  setRunningId(null)
                }
              }}
            >
              <Play className='mr-1 h-3 w-3' />
              Run
            </Button>
          </div>
        </div>
      ))}
      <Link to='/reports'>
        <Button variant='ghost' size='sm'>
          Manage Reports
        </Button>
      </Link>
    </div>
  )
}
