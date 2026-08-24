'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { mapSyncConnectionAccount, type SyncConnection, type SyncConnectionAccount } from '@/lib/bank-sync-client'
import type { FinanceAccount } from '@/lib/finance-client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type MapMode = 'create' | 'existing'
type Choice = { mode: MapMode; name: string; existingId: string }

/** Picking a FinTrack account for each provider-discovered account still
 * unmapped on a connection. Shared by ConnectBankDialog (SimpleFIN, which
 * discovers accounts immediately) and the /bank-sync/callback page
 * (GoCardless, which discovers them after the user returns from their bank).
 */
export function MapDiscoveredAccounts({
  connection,
  existingAccounts,
  onMapped,
  onDone,
}: {
  connection: SyncConnection
  existingAccounts: FinanceAccount[]
  onMapped?: () => void
  onDone: () => void
}) {
  const unmapped = connection.linked_accounts.filter((linked) => linked.account == null)
  const [choices, setChoices] = useState<Record<number, Choice>>(() =>
    Object.fromEntries(
      unmapped.map((linked) => [
        linked.id,
        { mode: 'create' as MapMode, name: linked.display_name || linked.external_account_id, existingId: '' },
      ]),
    ),
  )
  const [savingId, setSavingId] = useState<number | null>(null)
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())

  const setChoice = (id: number, patch: Partial<Choice>) =>
    setChoices((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  const saveOne = async (linked: SyncConnectionAccount) => {
    const choice = choices[linked.id]
    if (choice.mode === 'existing' && !choice.existingId) {
      toast.error('Choose an account to link to first')
      return
    }
    setSavingId(linked.id)
    try {
      if (choice.mode === 'existing') {
        await mapSyncConnectionAccount(linked.id, { account_id: Number(choice.existingId) })
      } else {
        await mapSyncConnectionAccount(linked.id, { create_account: { name: choice.name.trim() || undefined } })
      }
      setSavedIds((prev) => new Set(prev).add(linked.id))
      onMapped?.()
    } catch {
      toast.error(`Couldn't link ${linked.display_name || linked.external_account_id}`)
    } finally {
      setSavingId(null)
    }
  }

  if (unmapped.length === 0) {
    return (
      <div className='space-y-4 py-6 text-center'>
        <p className='text-sm text-muted-foreground'>
          Every account from {connection.institution_name || connection.provider_label} is already linked.
        </p>
        <Button onClick={onDone}>Done</Button>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <p className='text-sm text-muted-foreground'>
        {connection.institution_name || connection.provider_label} has {unmapped.length} account
        {unmapped.length === 1 ? '' : 's'}. Choose where each one goes in FinTrack.
      </p>

      {unmapped.map((linked) => {
        const choice = choices[linked.id]
        const saved = savedIds.has(linked.id)
        return (
          <div key={linked.id} className='space-y-3 rounded-md border p-3'>
            <div className='flex items-center justify-between gap-2'>
              <div className='min-w-0'>
                <div className='truncate font-medium'>{linked.display_name || linked.external_account_id}</div>
                <div className='truncate text-xs text-muted-foreground'>
                  {linked.currency_code}
                  {linked.iban ? ` · ${linked.iban}` : ''}
                </div>
              </div>
              {saved && <Badge variant='secondary'>Linked</Badge>}
            </div>

            {!saved && (
              <>
                <RadioGroup
                  value={choice.mode}
                  onValueChange={(mode) => setChoice(linked.id, { mode: mode as MapMode })}
                  className='flex gap-4'
                >
                  <Label className='flex items-center gap-2 text-sm font-normal'>
                    <RadioGroupItem value='create' /> Create a new account
                  </Label>
                  <Label className='flex items-center gap-2 text-sm font-normal'>
                    <RadioGroupItem value='existing' /> Link to an existing account
                  </Label>
                </RadioGroup>

                {choice.mode === 'create' ? (
                  <Input
                    value={choice.name}
                    onChange={(e) => setChoice(linked.id, { name: e.target.value })}
                    placeholder='Account name'
                  />
                ) : (
                  <Select
                    value={choice.existingId}
                    onValueChange={(value) => setChoice(linked.id, { existingId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Choose an account' />
                    </SelectTrigger>
                    <SelectContent>
                      {existingAccounts.map((account) => (
                        <SelectItem key={account.id} value={String(account.id)}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button size='sm' disabled={savingId === linked.id} onClick={() => saveOne(linked)}>
                  {savingId === linked.id ? 'Linking…' : 'Link this account'}
                </Button>
              </>
            )}
          </div>
        )
      })}

      <Button variant='outline' className='w-full' onClick={onDone}>
        Done
      </Button>
    </div>
  )
}
