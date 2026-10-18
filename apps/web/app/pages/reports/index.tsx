'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pin, PinOff, Play, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  createSavedReport,
  deleteSavedReport,
  listSavedReports,
  runAdhocReport,
  runSavedReport,
  updateSavedReport,
  type SavedReport,
} from '@/lib/finance-client'

import { ReportResult, type ReportResultData } from '@/components/report-result'
import { PinnedReports } from '@/components/pinned-reports'
import { LoadError } from '@/components/load-error'
import Typography from '@/components/ui/typography'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

const today = new Date().toISOString().slice(0, 10)

export default function ReportsPage() {
  const { t } = useTranslation()
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const [loadFailed, setLoadFailed] = useState(false)
  const [runningReport, setRunningReport] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  const [reportType, setReportType] = useState<SavedReport['report_type']>('cash_flow')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [groupBy, setGroupBy] = useState<'category' | 'month'>('category')
  const [saveName, setSaveName] = useState('')
  const [pinOnSave, setPinOnSave] = useState(false)

  const currentDefinition = useMemo(() => {
    const payload: Record<string, unknown> = {
      report_type: reportType,
    }

    if (reportType === 'net_worth') {
      payload.as_of = endDate
    } else {
      payload.start_date = startDate
      payload.end_date = endDate
    }

    if (reportType === 'custom') {
      payload.group_by = groupBy
    }

    return payload
  }, [reportType, startDate, endDate, groupBy])

  const refreshSavedReports = async () => {
    try {
      setLoadFailed(false)
      const reports = await listSavedReports()
      setSavedReports(reports)
    } catch {
      setLoadFailed(true)
    }
  }

  useEffect(() => {
    // Deferred a tick so the synchronous part of the loader's setState calls
    // do not run inside the effect body itself (react-hooks/set-state-in-effect).
    const id = setTimeout(() => void refreshSavedReports(), 0)
    return () => clearTimeout(id)
  }, [])

  const handleRunAdhoc = async () => {
    try {
      setRunningReport(true)
      const data = await runAdhocReport(currentDefinition)
      setResult(data)
      toast.success(t('reports.shown'))
    } catch {
      toast.error(t('reports.showFailed'))
    } finally {
      setRunningReport(false)
    }
  }

  const handleSaveReport = async () => {
    if (!saveName.trim()) {
      toast.error(t('reports.nameRequired'))
      return
    }

    try {
      await createSavedReport({
        name: saveName.trim(),
        report_type: reportType,
        definition: currentDefinition,
        pinned: pinOnSave,
      })
      toast.success(t('reports.saved'))
      setSaveName('')
      setPinOnSave(false)
      await refreshSavedReports()
    } catch {
      toast.error(t('reports.saveFailed'))
    }
  }

  const handleTogglePin = async (report: SavedReport) => {
    try {
      await updateSavedReport(report.id, { pinned: !report.pinned })
      await refreshSavedReports()
    } catch {
      toast.error(t('reports.pinFailed'))
    }
  }

  const handleRunSaved = async (report: SavedReport) => {
    try {
      setRunningReport(true)
      const data = await runSavedReport(report.id)
      setResult(data)
      toast.success(t('reports.ran', { name: report.name }))
    } catch {
      toast.error(t('reports.runFailed'))
    } finally {
      setRunningReport(false)
    }
  }

  const handleDeleteSaved = async (report: SavedReport) => {
    try {
      await deleteSavedReport(report.id)
      toast.success(t('reports.deleted'))
      await refreshSavedReports()
    } catch {
      toast.error(t('reports.deleteFailed'))
    }
  }


  // A failed load is not an empty list: say so instead of "No ... yet".
  if (loadFailed) {
    return (
      <div className='space-y-4 p-6'>
        <Typography variant='h2' as='h1'>
          {t('reports.title')}
        </Typography>
        <LoadError what={t('loadError.reports')} onRetry={() => void refreshSavedReports()} />
      </div>
    )
  }
  return (
    <div className='space-y-6 p-6'>
      <Typography variant='h2' as='h1'>{t('reports.title')}</Typography>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.pinnedTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <PinnedReports />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.makeTitle')}</CardTitle>
          <CardDescription>{t('reports.makeDescription')}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-4'>
            <div className='space-y-2'>
              <Label htmlFor='report-type'>{t('reports.type')}</Label>
              <Select value={reportType} onValueChange={(value) => setReportType(value as SavedReport['report_type'])}>
                <SelectTrigger id='report-type'>
                  <SelectValue placeholder={t('reports.reportType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='net_worth'>{t('reports.typeNetWorth')}</SelectItem>
                  <SelectItem value='cash_flow'>{t('reports.typeCashFlow')}</SelectItem>
                  <SelectItem value='spending'>{t('reports.typeSpending')}</SelectItem>
                  <SelectItem value='custom'>{t('reports.typeCustom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType !== 'net_worth' ? (
              <>
                <div className='space-y-2'>
                  <Label htmlFor='report-start-date'>{t('reports.startDate')}</Label>
                  <Input
                    id='report-start-date'
                    type='date'
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='report-end-date'>{t('reports.endDate')}</Label>
                  <Input
                    id='report-end-date'
                    type='date'
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className='space-y-2'>
                <Label htmlFor='report-as-of'>{t('reports.asOf')}</Label>
                <Input
                  id='report-as-of'
                  type='date'
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}

            {reportType === 'custom' && (
              <div className='space-y-2'>
                <Label htmlFor='report-group-by'>{t('reports.groupBy')}</Label>
                <Select value={groupBy} onValueChange={(value) => setGroupBy(value as 'category' | 'month')}>
                  <SelectTrigger id='report-group-by'>
                    <SelectValue placeholder={t('reports.groupBy')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='category'>{t('reports.groupCategory')}</SelectItem>
                    <SelectItem value='month'>{t('reports.groupMonth')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className='flex flex-wrap items-end gap-3'>
            <div className='flex-1 min-w-[220px] space-y-2'>
              <Label htmlFor='report-save-name'>{t('reports.saveAs')}</Label>
              <Input
                id='report-save-name'
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={t('reports.saveAsPlaceholder')}
              />
            </div>
            <div className='flex items-center gap-2 pb-1'>
              <Switch id='report-pin-on-save' checked={pinOnSave} onCheckedChange={setPinOnSave} />
              <Label htmlFor='report-pin-on-save'>{t('reports.alsoPin')}</Label>
            </div>
            <Button variant='outline' onClick={() => void handleSaveReport()}>
              <Plus className='mr-2 h-4 w-4' />
              {t('reports.save')}
            </Button>
            <Button onClick={() => void handleRunAdhoc()} disabled={runningReport}>
              <Play className='mr-2 h-4 w-4' />
              {t('reports.show')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.savedTitle')}</CardTitle>
          <CardDescription>{t('reports.savedDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('reports.name')}</TableHead>
                <TableHead>{t('reports.type')}</TableHead>
                <TableHead>{t('reports.pinned')}</TableHead>
                <TableHead className='w-[220px]'>{t('reports.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {savedReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className='text-center text-muted-foreground'>
                    {t('reports.noSaved')}
                  </TableCell>
                </TableRow>
              ) : (
                savedReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className='font-medium'>{report.name}</TableCell>
                    <TableCell>
                      <Badge variant='outline'>{report.report_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => void handleTogglePin(report)}
                        aria-label={report.pinned ? t('reports.unpin') : t('reports.pin')}
                      >
                        {report.pinned ? <Pin className='h-4 w-4 text-caution' /> : <PinOff className='h-4 w-4' />}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Button variant='outline' size='sm' onClick={() => void handleRunSaved(report)}>
                          <Play className='mr-2 h-4 w-4' />
                          {t('reports.run')}
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => void handleDeleteSaved(report)}
                          className='text-destructive hover:text-destructive'
                        >
                          <Trash2 className='mr-2 h-4 w-4' />
                          {t('reports.delete')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.resultTitle')}</CardTitle>
          <CardDescription>{t('reports.resultDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {result ? (
            <ReportResult result={result as ReportResultData} />
          ) : (
            <p className='text-sm text-muted-foreground'>{t('reports.resultEmpty')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
