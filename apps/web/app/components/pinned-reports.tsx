'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pin, Play } from 'lucide-react'
import { toast } from 'sonner'

import { listSavedReports, runSavedReport, type SavedReport } from '@/lib/finance-client'
import { LoadError } from '@/components/load-error'
import { Button } from '@/components/ui/button'

export function PinnedReports() {
  const { t } = useTranslation()
  const [reports, setReports] = useState<SavedReport[]>([])
  const [runningId, setRunningId] = useState<number | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let canceled = false

    const load = async () => {
      try {
        const rows = await listSavedReports({ pinned: true })
        if (!canceled) {
          setReports(rows)
          setLoadFailed(false)
        }
      } catch {
        if (!canceled) setLoadFailed(true)
      }
    }

    void load()
    return () => {
      canceled = true
    }
  }, [attempt])

  if (loadFailed) {
    return (
      <LoadError
        inline
        what={t('loadError.pinnedReports')}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    )
  }

  if (!reports.length) {
    return (
      <p className='text-sm text-muted-foreground'>
        {t('pinnedReports.empty')}
      </p>
    )
  }

  return (
    <div className='space-y-2'>
      {reports.map((report) => (
        <div key={report.id} className='flex items-center justify-between rounded-md border p-2'>
          <div className='flex items-center gap-2'>
            <Pin className='h-3 w-3 text-caution' />
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
                  toast.success(t('pinnedReports.ran', { name: report.name }))
                } catch {
                  toast.error(t('pinnedReports.runFailed'))
                } finally {
                  setRunningId(null)
                }
              }}
            >
              <Play className='mr-1 h-3 w-3' />
              {t('pinnedReports.run')}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
