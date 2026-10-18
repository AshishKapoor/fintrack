'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      toast.error(t('mapAccounts.chooseFirst'))
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
      toast.error(t('mapAccounts.linkFailed', { name: linked.display_name || linked.external_account_id }))
    } finally {
      setSavingId(null)
    }
  }

  if (unmapped.length === 0) {
    return (
      <div className='space-y-4 py-6 text-center'>
        <p className='text-sm text-muted-foreground'>
          {t('mapAccounts.allLinked', { name: connection.institution_name || connection.provider_label })}
        </p>
        <Button onClick={onDone}>{t('mapAccounts.done')}</Button>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      <p className='text-sm text-muted-foreground'>
        {t('mapAccounts.intro', {
          name: connection.institution_name || connection.provider_label,
          count: unmapped.length,
        })}
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
              {saved && <Badge variant='secondary'>{t('mapAccounts.linked')}</Badge>}
            </div>

            {!saved && (
              <>
                <RadioGroup
                  value={choice.mode}
                  onValueChange={(mode) => setChoice(linked.id, { mode: mode as MapMode })}
                  className='flex gap-4'
                >
                  <Label className='flex items-center gap-2 text-sm font-normal'>
                    <RadioGroupItem value='create' /> {t('mapAccounts.createNew')}
                  </Label>
                  <Label className='flex items-center gap-2 text-sm font-normal'>
                    <RadioGroupItem value='existing' /> {t('mapAccounts.linkExisting')}
                  </Label>
                </RadioGroup>

                {choice.mode === 'create' ? (
                  <Input
                    value={choice.name}
                    onChange={(e) => setChoice(linked.id, { name: e.target.value })}
                    placeholder={t('mapAccounts.accountName')}
                  />
                ) : (
                  <Select
                    value={choice.existingId}
                    onValueChange={(value) => setChoice(linked.id, { existingId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('mapAccounts.chooseAccount')} />
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
                  {savingId === linked.id ? t('mapAccounts.linking') : t('mapAccounts.linkThis')}
                </Button>
              </>
            )}
          </div>
        )
      })}

      <Button variant='outline' className='w-full' onClick={onDone}>
        {t('mapAccounts.done')}
      </Button>
    </div>
  )
}
