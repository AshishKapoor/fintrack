import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronsUpDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useV1FinancePayeesList, v1FinancePayeesCreate } from '@/client/gen/pft/v1/v1'
import { cn } from '@/lib/utils'

/**
 * Search-or-create picker for LedgerTransaction.payee. There is no dedicated
 * "payee" endpoint search param, so filtering happens client-side over the
 * budget file's payee list - the same list every other payee-aware screen
 * (rules, import mapping) already loads in full.
 */
export function PayeeCombobox({
  budgetFileId,
  value,
  onChange,
}: {
  budgetFileId: number | null
  value: number | null
  /** payeeName is passed as a convenience for callers that want it without a second lookup. */
  onChange: (payeeId: number | null, payeeName?: string) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const { data: payees, mutate } = useV1FinancePayeesList()

  const scoped = (payees ?? []).filter(
    (payee) => !budgetFileId || payee.budget_file === budgetFileId,
  )
  const selected = scoped.find((payee) => payee.id === value)
  const query = search.trim()
  const filtered = scoped.filter((payee) =>
    payee.name.toLowerCase().includes(query.toLowerCase()),
  )
  const exactMatch = scoped.some((payee) => payee.name.toLowerCase() === query.toLowerCase())
  const canCreate = Boolean(query && !exactMatch && budgetFileId)

  const createAndSelect = async () => {
    if (!query || !budgetFileId || creating) return
    setCreating(true)
    try {
      const created = await v1FinancePayeesCreate({
        budget_file: budgetFileId,
        name: query,
      } as never)
      await mutate([...(payees ?? []), created], { revalidate: false })
      onChange(created.id, created.name)
      setOpen(false)
      setSearch('')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          aria-label={t('transactions.payee')}
          className='w-full justify-between font-normal'
        >
          {selected ? selected.name : t('transactions.payeePlaceholder')}
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[--radix-popover-trigger-width] p-0'>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('transactions.payeePlaceholder')}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filtered.length === 0 && !canCreate && (
              <CommandEmpty>{t('commandMenu.noResults')}</CommandEmpty>
            )}
            <CommandGroup>
              {filtered.map((payee) => (
                <CommandItem
                  key={payee.id}
                  value={String(payee.id)}
                  onSelect={() => {
                    onChange(payee.id === value ? null : payee.id, payee.name)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      payee.id === value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {payee.name}
                </CommandItem>
              ))}
              {canCreate && (
                <CommandItem
                  value={`__create__${query}`}
                  onSelect={createAndSelect}
                  disabled={creating}
                >
                  {t('transactions.payeeCreate', { name: query })}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
