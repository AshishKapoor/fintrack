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
      toast.error(`That file is larger than the ${MAX_BYTES / 1024 / 1024}MB import limit.`)
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
        toast.warning('No transactions were found in that file. Check the format.')
      }
    } catch (error: unknown) {
      const message =
        (error as { errorMessage?: string })?.errorMessage ?? 'Could not read that file.'
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
      const skipped = result.skipped ? `, ${result.skipped} already present` : ''
      toast.success(`Imported ${result.created} transaction(s)${skipped}.`)
      close()
    } catch (error: unknown) {
      const message =
        (error as { errorMessage?: string })?.errorMessage ?? 'The import failed.'
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
          <DialogTitle>Import transactions</DialogTitle>
          <DialogDescription>
            Import a statement from your bank. Transactions already present are skipped, so
            re-importing an overlapping file will not create duplicates.
          </DialogDescription>
        </DialogHeader>

        {step === 'choose' && (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='import-file'>Statement file</Label>
              <Input
                id='import-file'
                type='file'
                accept='.csv,.ofx,.qfx,.qif,.xml,.json,.txt'
                onChange={onFileSelected}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='import-format'>Format</Label>
              <Select value={format} onValueChange={(value) => setFormat(value as ImportFormat)}>
                <SelectTrigger id='import-format'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORT_FORMATS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label} — {item.hint}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className='text-xs text-muted-foreground'>
                Detected from the file extension; change it if your bank uses a different one.
              </p>
            </div>
          </div>
        )}

        {step !== 'choose' && preview && (
          <div className='space-y-3'>
            <p className='text-sm'>
              Found <span className='font-semibold'>{preview.detected_rows}</span> transaction(s)
              in <span className='font-mono'>{filename}</span>.
              {preview.detected_rows > preview.sample.length &&
                ` Showing the first ${preview.sample.length}.`}
            </p>

            <div className='max-h-72 overflow-y-auto rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Payee</TableHead>
                    <TableHead>Memo</TableHead>
                    <TableHead className='text-right'>Amount</TableHead>
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
                Cancel
              </Button>
              <Button onClick={runPreview} disabled={!payload || busy}>
                {busy ? 'Reading...' : 'Preview'}
              </Button>
            </>
          ) : (
            <>
              <Button variant='outline' onClick={() => setStep('choose')} disabled={busy}>
                Back
              </Button>
              <Button
                onClick={runImport}
                disabled={busy || !preview || preview.detected_rows === 0}
              >
                {step === 'importing' ? 'Importing...' : `Import ${preview?.detected_rows ?? 0}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
