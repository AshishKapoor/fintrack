import type { EncryptedBackupBundle } from '@/client/gen/pft/encryptedBackupBundle'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createBackup, decryptBackup, listBackups, restoreArchive } from '@/lib/backup'
import { downloadFile } from '@/lib/export'
import { useInvalidateLedger } from '@/lib/ledger'
import { useState } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'

/**
 * Encrypted backups, end to end in the browser.
 *
 * The passphrase never leaves this component: the archive is encrypted with
 * AES-GCM before upload, and restore decrypts locally then replays through the
 * public API. Losing the passphrase means losing the backup - the server
 * cannot help, by design.
 */
export function BackupManager() {
  const { data: bundles, mutate: refreshBundles } = useSWR('backups', listBackups)
  const [passphrase, setPassphrase] = useState('')
  const [confirmPassphrase, setConfirmPassphrase] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const refreshLedger = useInvalidateLedger()

  const canCreate = passphrase.length >= 8 && passphrase === confirmPassphrase && !busy

  const handleCreate = async () => {
    setBusy('create')
    try {
      await createBackup(passphrase)
      toast.success('Encrypted backup created.')
      setPassphrase('')
      setConfirmPassphrase('')
      await refreshBundles()
    } catch (error) {
      console.error('Backup failed:', error)
      toast.error('Could not create the backup.')
    } finally {
      setBusy(null)
    }
  }

  const askPassphrase = () => {
    // A prompt keeps the passphrase out of component state for these actions.
    return window.prompt('Backup passphrase:') ?? ''
  }

  const handleDownload = async (bundle: EncryptedBackupBundle) => {
    const entered = askPassphrase()
    if (!entered) return
    setBusy(`download-${bundle.id}`)
    try {
      const archive = await decryptBackup(bundle, entered)
      downloadFile(
        JSON.stringify(archive, null, 2),
        `fintrack-backup-${bundle.created_at?.slice(0, 10) ?? bundle.id}.json`,
        'application/json',
      )
      toast.success('Backup decrypted and downloaded.')
    } catch {
      toast.error('Wrong passphrase, or the bundle is corrupted.')
    } finally {
      setBusy(null)
    }
  }

  const handleRestore = async (bundle: EncryptedBackupBundle) => {
    const entered = askPassphrase()
    if (!entered) return
    setBusy(`restore-${bundle.id}`)
    try {
      const archive = await decryptBackup(bundle, entered)
      const result = await restoreArchive(archive)
      toast.success(
        `Restored ${result.transactions_created} transaction(s)` +
          (result.transactions_skipped
            ? `, ${result.transactions_skipped} already present`
            : '') +
          (result.budgets_restored ? `, ${result.budgets_restored} budget(s)` : '') +
          '.',
      )
      await refreshLedger()
    } catch (error) {
      console.error('Restore failed:', error)
      toast.error('Restore failed - wrong passphrase, or the bundle is corrupted.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Create an encrypted backup</CardTitle>
          <CardDescription>
            Your whole ledger, encrypted in the browser before upload. The server stores only
            ciphertext — if you lose the passphrase, nobody can recover the backup.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-2'>
            <Label htmlFor='backup-passphrase'>Passphrase (at least 8 characters)</Label>
            <Input
              id='backup-passphrase'
              type='password'
              autoComplete='new-password'
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='backup-passphrase-confirm'>Confirm passphrase</Label>
            <Input
              id='backup-passphrase-confirm'
              type='password'
              autoComplete='new-password'
              value={confirmPassphrase}
              onChange={(event) => setConfirmPassphrase(event.target.value)}
            />
          </div>
          <Button onClick={handleCreate} disabled={!canCreate}>
            {busy === 'create' ? 'Encrypting...' : 'Create backup'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stored backups</CardTitle>
          <CardDescription>
            Restore replays the archive through the normal API: entities are matched by name,
            and transactions already present are skipped, so restoring twice never duplicates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!bundles?.length ? (
            <p className='text-sm text-muted-foreground'>No backups yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Contents</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bundles.map((bundle) => {
                  const meta = (bundle.metadata ?? {}) as { transactions?: number }
                  return (
                    <TableRow key={bundle.id}>
                      <TableCell>
                        {bundle.created_at
                          ? new Date(bundle.created_at).toLocaleString()
                          : `Bundle ${bundle.id}`}
                      </TableCell>
                      <TableCell className='text-muted-foreground'>
                        {meta.transactions != null
                          ? `${meta.transactions} transaction(s)`
                          : 'Encrypted archive'}
                      </TableCell>
                      <TableCell className='text-right space-x-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={busy !== null}
                          onClick={() => handleDownload(bundle)}
                        >
                          {busy === `download-${bundle.id}` ? 'Decrypting...' : 'Download'}
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={busy !== null}
                          onClick={() => handleRestore(bundle)}
                        >
                          {busy === `restore-${bundle.id}` ? 'Restoring...' : 'Restore'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
