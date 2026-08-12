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
import { toast } from 'sonner'

const CONFIRMATION = 'DELETE'

/**
 * Deleting an account cascades to every budget file, account, transaction and
 * posting the user owns, and there is no undo. The dialog therefore asks for
 * the password and an explicit confirmation phrase, and the API checks both.
 */
export function DeleteAccountDialog() {
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
      toast.success('Your account and all of its data have been deleted.')
      // logout() clears the local tokens and redirects to /login. The refresh
      // token is already revoked server-side by the delete endpoint.
      await logout()
    } catch (error: unknown) {
      const message =
        (error as { errorMessage?: string })?.errorMessage ??
        'Could not delete the account. Check your password and try again.'
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
        <Button variant='destructive'>Delete Account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This permanently deletes your account and everything in it: every budget file,
            account, category, transaction and report. It cannot be undone. Export your data
            first if you want to keep it.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='delete-account-password'>Confirm your password</Label>
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
              Type <span className='font-mono font-semibold'>{CONFIRMATION}</span> to confirm
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
            Cancel
          </Button>
          <Button variant='destructive' onClick={deleteAccount} disabled={!canSubmit}>
            {submitting ? 'Deleting...' : 'Delete my account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
