import { useInvalidateLedger } from '@/lib/ledger'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  IMPORT_FORMATS,
  createImportJob,
  executeImportJob,
  formatFromFilename,
  previewImportJob,
  type ImportFormat,
  type ImportPreview,
} from '@/lib/import-client'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'

// The API caps the payload; mirror it here so a too-large file fails before
// being read into memory and posted.
const MAX_BYTES = 5 * 1024 * 1024

type Step = 'choose' | 'preview' | 'importing'

export function ImportTransactionsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('choose')
  const [format, setFormat] = useState<ImportFormat>('csv')
  const [filename, setFilename] = useState('')
  const [payload, setPayload] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [jobId, setJobId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const invalidateTransactions = useInvalidateLedger()

  const reset = () => {
    setStep('choose')
    setFormat('csv')
    setFilename('')
    setPayload('')
    setPreview(null)
    setJobId(null)
    setBusy(false)
  }

  const close = () => {
    onOpenChange(false)
    reset()
  }

  const onFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > MAX_BYTES) {
      toast.error(t('importTransactions.tooLarge', { limit: MAX_BYTES / 1024 / 1024 }))
      return
    }

    setFilename(file.name)
    setFormat(formatFromFilename(file.name))
    setPayload(await file.text())
  }

  const runPreview = async () => {
    setBusy(true)
    try {
      const job = await createImportJob(format, filename || 'statement', payload)
      const summary = await previewImportJob(job.id)
      setJobId(job.id)
      setPreview(summary)
      setStep('preview')

      if (summary.detected_rows === 0) {
        toast.warning(t('importTransactions.noneFound'))
      }
    } catch (error: unknown) {
      const message =
        (error as { errorMessage?: string })?.errorMessage ?? t('importTransactions.readFailed')
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const runImport = async () => {
    if (!jobId) return
    setStep('importing')
    setBusy(true)
    try {
      const result = await executeImportJob(jobId)
      await invalidateTransactions()
      const skipped = result.skipped
        ? t('importTransactions.skipped', { count: result.skipped })
        : ''
      toast.success(t('importTransactions.imported', { count: result.created, skipped }))
      close()
    } catch (error: unknown) {
      const message =
        (error as { errorMessage?: string })?.errorMessage ??
        (error instanceof Error ? error.message : t('importTransactions.importFailed'))
      toast.error(message)
      setStep('preview')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{t('importTransactions.title')}</DialogTitle>
          <DialogDescription>
            {t('importTransactions.description')}
          </DialogDescription>
        </DialogHeader>

        {step === 'choose' && (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='import-file'>{t('importTransactions.file')}</Label>
              <Input
                id='import-file'
                type='file'
                accept='.csv,.ofx,.qfx,.qif,.xml,.json,.txt'
                onChange={onFileSelected}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='import-format'>{t('importTransactions.format')}</Label>
              <Select value={format} onValueChange={(value) => setFormat(value as ImportFormat)}>
                <SelectTrigger id='import-format'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORT_FORMATS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label} — {t(`importTransactions.formatHints.${item.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='text-xs text-muted-foreground'>
                {t('importTransactions.formatHint')}
              </p>
            </div>
          </div>
        )}

        {step !== 'choose' && preview && (
          <div className='space-y-3'>
            <p className='text-sm'>
              <Trans
                i18nKey='importTransactions.found'
                count={preview.detected_rows}
                values={{ filename }}
                components={{
                  num: <span className='font-semibold' />,
                  file: <span className='font-mono' />,
                }}
              />
              {preview.detected_rows > preview.sample.length &&
                t('importTransactions.showingFirst', { count: preview.sample.length })}
            </p>

            <div className='max-h-72 overflow-y-auto rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('importTransactions.date')}</TableHead>
                    <TableHead>{t('transactions.payee')}</TableHead>
                    <TableHead>{t('importTransactions.memo')}</TableHead>
                    <TableHead className='text-right'>{t('importTransactions.amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.sample.map((row, index) => (
                    <TableRow key={`${row.date}-${index}`}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.payee || '—'}</TableCell>
                      <TableCell>{row.memo || '—'}</TableCell>
                      <TableCell className='text-right font-mono'>{row.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'choose' ? (
            <>
              <Button variant='outline' onClick={close} disabled={busy}>
                {t('common.cancel')}
              </Button>
              <Button onClick={runPreview} disabled={!payload || busy}>
                {busy ? t('importTransactions.reading') : t('importTransactions.preview')}
              </Button>
            </>
          ) : (
            <>
              <Button variant='outline' onClick={() => setStep('choose')} disabled={busy}>
                {t('importTransactions.back')}
              </Button>
              <Button
                onClick={runImport}
                disabled={busy || !preview || preview.detected_rows === 0}
              >
                {step === 'importing'
                  ? t('importTransactions.importing')
                  : t('importTransactions.importCount', { number: preview?.detected_rows ?? 0 })}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
