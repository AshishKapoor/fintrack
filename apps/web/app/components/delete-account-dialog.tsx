import { httpPFTClient } from '@/client/httpPFTClient'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { logout } from '@/lib/auth'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

const CONFIRMATION = 'DELETE'

/**
 * Deleting an account cascades to every budget file, account, transaction and
 * posting the user owns, and there is no undo. The dialog therefore asks for
 * the password and an explicit confirmation phrase, and the API checks both.
 */
export function DeleteAccountDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = password.length > 0 && confirmation === CONFIRMATION && !submitting

  const reset = () => {
    setPassword('')
    setConfirmation('')
  }

  const deleteAccount = async () => {
    setSubmitting(true)
    try {
      await httpPFTClient({
        url: '/api/v1/profile/delete-account/',
        method: 'POST',
        data: { password, confirmation },
      })
      toast.success(t('deleteAccount.deleted'))
      // logout() clears the local tokens and redirects to /login. The refresh
      // token is already revoked server-side by the delete endpoint.
      await logout()
    } catch (error: unknown) {
      const message =
        (error as { errorMessage?: string })?.errorMessage ??
        t('deleteAccount.failed')
      toast.error(message)
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant='destructive'>{t('deleteAccount.trigger')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('deleteAccount.title')}</DialogTitle>
          <DialogDescription>
            {t('deleteAccount.description')}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='delete-account-password'>{t('deleteAccount.password')}</Label>
            <Input
              id='delete-account-password'
              type='password'
              autoComplete='current-password'
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='delete-account-confirmation'>
              {t('deleteAccount.typePrefix')}{' '}
              <span className='font-mono font-semibold'>{CONFIRMATION}</span>{' '}
              {t('deleteAccount.typeSuffix')}
            </Label>
            <Input
              id='delete-account-confirmation'
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button variant='destructive' onClick={deleteAccount} disabled={!canSubmit}>
            {submitting ? t('deleteAccount.deleting') : t('deleteAccount.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
