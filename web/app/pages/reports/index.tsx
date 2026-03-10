'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pin, PinOff, Play, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  V2_ENABLED,
  createSavedReport,
  deleteSavedReport,
  listSavedReports,
  runAdhocReport,
  runSavedReport,
  updateSavedReport,
  type SavedReport,
} from '@/lib/v2-client'

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
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const [loadingSaved, setLoadingSaved] = useState(false)
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
      setLoadingSaved(true)
      const reports = await listSavedReports()
      setSavedReports(reports)
    } catch {
      toast.error('Failed to load saved reports')
    } finally {
      setLoadingSaved(false)
    }
  }

  useEffect(() => {
    if (!V2_ENABLED) return
    void refreshSavedReports()
  }, [])

  const handleRunAdhoc = async () => {
    try {
      setRunningReport(true)
      const data = await runAdhocReport(currentDefinition)
      setResult(data)
      toast.success('Report generated')
    } catch {
      toast.error('Failed to run report')
    } finally {
      setRunningReport(false)
    }
  }

  const handleSaveReport = async () => {
    if (!saveName.trim()) {
      toast.error('Report name is required')
      return
    }

    try {
      await createSavedReport({
        name: saveName.trim(),
        report_type: reportType,
        definition: currentDefinition,
        pinned: pinOnSave,
      })
      toast.success('Report saved')
      setSaveName('')
      setPinOnSave(false)
      await refreshSavedReports()
    } catch {
      toast.error('Failed to save report')
    }
  }

  const handleTogglePin = async (report: SavedReport) => {
    try {
      await updateSavedReport(report.id, { pinned: !report.pinned })
      await refreshSavedReports()
    } catch {
      toast.error('Failed to update pin state')
    }
  }

  const handleRunSaved = async (report: SavedReport) => {
    try {
      setRunningReport(true)
      const data = await runSavedReport(report.id)
      setResult(data)
      toast.success(`Ran ${report.name}`)
    } catch {
      toast.error('Failed to run saved report')
    } finally {
      setRunningReport(false)
    }
  }

  const handleDeleteSaved = async (report: SavedReport) => {
    try {
      await deleteSavedReport(report.id)
      toast.success('Saved report deleted')
      await refreshSavedReports()
    } catch {
      toast.error('Failed to delete saved report')
    }
  }

  if (!V2_ENABLED) {
    return (
      <div className='p-6 space-y-2'>
        <Typography variant='h2'>Reports</Typography>
        <p className='text-sm text-muted-foreground'>
          Enable <code>VITE_FINANCE_V2=true</code> to use reports, saved report pinning, and v2 analytics.
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-6 p-6'>
      <div className='flex items-center justify-between'>
        <Typography variant='h2'>Reports</Typography>
        <Button variant='outline' onClick={() => void refreshSavedReports()} disabled={loadingSaved}>
          <RefreshCw className='mr-2 h-4 w-4' />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run Report</CardTitle>
          <CardDescription>Generate net worth, cash flow, spending, or custom grouped reports.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-4'>
            <div className='space-y-2'>
              <Label>Type</Label>
              <Select value={reportType} onValueChange={(value) => setReportType(value as SavedReport['report_type'])}>
                <SelectTrigger>
                  <SelectValue placeholder='Report type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='net_worth'>Net Worth</SelectItem>
                  <SelectItem value='cash_flow'>Cash Flow</SelectItem>
                  <SelectItem value='spending'>Spending Trends</SelectItem>
                  <SelectItem value='custom'>Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType !== 'net_worth' ? (
              <>
                <div className='space-y-2'>
                  <Label>Start date</Label>
                  <Input type='date' value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className='space-y-2'>
                  <Label>End date</Label>
                  <Input type='date' value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </>
            ) : (
              <div className='space-y-2'>
                <Label>As of</Label>
                <Input type='date' value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            )}

            {reportType === 'custom' && (
              <div className='space-y-2'>
                <Label>Group by</Label>
                <Select value={groupBy} onValueChange={(value) => setGroupBy(value as 'category' | 'month')}>
                  <SelectTrigger>
                    <SelectValue placeholder='Group by' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='category'>Category</SelectItem>
                    <SelectItem value='month'>Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className='flex flex-wrap items-end gap-3'>
            <div className='flex-1 min-w-[220px] space-y-2'>
              <Label>Save as report</Label>
              <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder='e.g. Monthly Cash Flow' />
            </div>
            <div className='flex items-center gap-2 pb-1'>
              <Switch checked={pinOnSave} onCheckedChange={setPinOnSave} />
              <Label>Pin on save</Label>
            </div>
            <Button variant='outline' onClick={() => void handleSaveReport()}>
              <Plus className='mr-2 h-4 w-4' />
              Save
            </Button>
            <Button onClick={() => void handleRunAdhoc()} disabled={runningReport}>
              <Play className='mr-2 h-4 w-4' />
              Run
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved Reports</CardTitle>
          <CardDescription>Pin reports to keep quick access to important analytics.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Pinned</TableHead>
                <TableHead className='w-[220px]'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {savedReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className='text-center text-muted-foreground'>
                    No saved reports yet.
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
                        aria-label={report.pinned ? 'Unpin report' : 'Pin report'}
                      >
                        {report.pinned ? <Pin className='h-4 w-4 text-amber-600' /> : <PinOff className='h-4 w-4' />}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Button variant='outline' size='sm' onClick={() => void handleRunSaved(report)}>
                          <Play className='mr-2 h-4 w-4' />
                          Run
                        </Button>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => void handleDeleteSaved(report)}
                          className='text-destructive hover:text-destructive'
                        >
                          <Trash2 className='mr-2 h-4 w-4' />
                          Delete
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
          <CardTitle>Report Output</CardTitle>
          <CardDescription>Latest ad-hoc or saved report run payload.</CardDescription>
        </CardHeader>
        <CardContent>
          {result ? (
            <pre className='rounded-md border bg-muted/30 p-4 text-xs overflow-x-auto'>
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : (
            <p className='text-sm text-muted-foreground'>Run a report to see output.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
