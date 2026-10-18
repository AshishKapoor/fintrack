'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Building2, Landmark, Search } from 'lucide-react'
import { toast } from 'sonner'

import {
  createSyncConnection,
  finishBankLinkAndDiscoverAccounts,
  listBankInstitutions,
  listBankSyncProviders,
  startBankLink,
  type BankSyncInstitution,
  type BankSyncProviderInfo,
  type SyncConnection,
} from '@/lib/bank-sync-client'
import type { FinanceAccount } from '@/lib/finance-client'

import i18n from '@/i18n'
import { MapDiscoveredAccounts } from '@/components/map-discovered-accounts'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// A curated subset of the many countries GoCardless Bank Account Data
// covers - enough to get someone going without shipping an exhaustive list
// that's mostly noise for any one user.
const GOCARDLESS_COUNTRIES = [
  { code: 'GB', label: 'United Kingdom' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'ES', label: 'Spain' },
  { code: 'IT', label: 'Italy' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'IE', label: 'Ireland' },
  { code: 'PT', label: 'Portugal' },
  { code: 'BE', label: 'Belgium' },
  { code: 'AT', label: 'Austria' },
  { code: 'DK', label: 'Denmark' },
  { code: 'SE', label: 'Sweden' },
  { code: 'FI', label: 'Finland' },
  { code: 'NO', label: 'Norway' },
  { code: 'PL', label: 'Poland' },
]

// Catalogue key per country; GOCARDLESS_COUNTRIES keeps the English labels.
const COUNTRY_KEYS: Record<string, string> = {
  GB: 'connectBank.countryGB',
  DE: 'connectBank.countryDE',
  FR: 'connectBank.countryFR',
  ES: 'connectBank.countryES',
  IT: 'connectBank.countryIT',
  NL: 'connectBank.countryNL',
  IE: 'connectBank.countryIE',
  PT: 'connectBank.countryPT',
  BE: 'connectBank.countryBE',
  AT: 'connectBank.countryAT',
  DK: 'connectBank.countryDK',
  SE: 'connectBank.countrySE',
  FI: 'connectBank.countryFI',
  NO: 'connectBank.countryNO',
  PL: 'connectBank.countryPL',
}

type Step =
  | 'provider'
  | 'gocardless-country'
  | 'gocardless-institution'
  | 'simplefin-token'
  | 'mapping'

export function ConnectBankDialog({
  open,
  onOpenChange,
  existingAccounts,
  onLinked,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingAccounts: FinanceAccount[]
  onLinked?: () => void
}) {
  const { t } = useTranslation()
  const countryLabel = (code: string) => {
    const key = COUNTRY_KEYS[code]
    return key ? t(key) : code
  }
  const [step, setStep] = useState<Step>('provider')
  const [providers, setProviders] = useState<BankSyncProviderInfo[]>([])

  const [country, setCountry] = useState('')
  const [institutions, setInstitutions] = useState<BankSyncInstitution[]>([])
  const [institutionSearch, setInstitutionSearch] = useState('')
  const [loadingInstitutions, setLoadingInstitutions] = useState(false)
  const [connectingInstitutionId, setConnectingInstitutionId] = useState('')

  const [setupToken, setSetupToken] = useState('')
  const [connectingSimplefin, setConnectingSimplefin] = useState(false)

  const [connection, setConnection] = useState<SyncConnection | null>(null)

  useEffect(() => {
    if (!open) return
    setStep('provider')
    setCountry('')
    setInstitutions([])
    setInstitutionSearch('')
    setSetupToken('')
    setConnection(null)
    listBankSyncProviders()
      .then(setProviders)
      // i18n.t rather than the hook's t, so the effect still only reruns on open.
      .catch(() => toast.error(i18n.t('connectBank.providersFailed')))
  }, [open])

  const chooseCountry = async (code: string) => {
    setCountry(code)
    setStep('gocardless-institution')
    setLoadingInstitutions(true)
    try {
      const rows = await listBankInstitutions('gocardless', code)
      setInstitutions(rows)
    } catch {
      toast.error(t('connectBank.institutionsFailed'))
    } finally {
      setLoadingInstitutions(false)
    }
  }

  const connectGoCardless = async (institution: BankSyncInstitution) => {
    setConnectingInstitutionId(institution.id)
    try {
      const created = await createSyncConnection('gocardless')
      const result = await startBankLink(created.id, { institution_id: institution.id })
      if (!result.redirect_url) throw new Error('No redirect URL returned')
      // Leaves the SPA on purpose: the user authenticates at their own bank,
      // which then redirects back to /bank-sync/callback?connection=<id>.
      window.location.href = result.redirect_url
    } catch {
      toast.error(t('connectBank.startFailed'))
      setConnectingInstitutionId('')
    }
  }

  const connectSimplefin = async () => {
    if (!setupToken.trim()) {
      toast.error(t('connectBank.tokenRequired'))
      return
    }
    setConnectingSimplefin(true)
    try {
      const created = await createSyncConnection('simplefin')
      await startBankLink(created.id, { setup_token: setupToken.trim() })
      const withAccounts = await finishBankLinkAndDiscoverAccounts(created.id)
      setConnection(withAccounts)
      setStep('mapping')
    } catch {
      toast.error(t('connectBank.simplefinFailed'))
    } finally {
      setConnectingSimplefin(false)
    }
  }

  const filteredInstitutions = institutions.filter((institution) =>
    institution.name.toLowerCase().includes(institutionSearch.toLowerCase()),
  )

  const goCardlessProvider = providers.find((p) => p.key === 'gocardless')
  const simplefinProvider = providers.find((p) => p.key === 'simplefin')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[520px]'>
        <DialogHeader>
          <DialogTitle>{t('connectBank.title')}</DialogTitle>
          <DialogDescription>
            {t('connectBank.description')}
          </DialogDescription>
        </DialogHeader>

        {step === 'provider' && (
          <div className='space-y-3'>
            <button
              type='button'
              disabled={!goCardlessProvider?.configured}
              onClick={() => setStep('gocardless-country')}
              className='flex w-full items-start gap-3 rounded-md border p-4 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
            >
              <Landmark className='mt-0.5 h-5 w-5 shrink-0' />
              <div>
                <div className='font-medium'>GoCardless Bank Account Data</div>
                <div className='text-sm text-muted-foreground'>
                  {t('connectBank.gocardlessDescription')}
                  {!goCardlessProvider?.configured && ` ${t('connectBank.gocardlessNotConfigured')}`}
                </div>
              </div>
            </button>

            <button
              type='button'
              disabled={!simplefinProvider}
              onClick={() => setStep('simplefin-token')}
              className='flex w-full items-start gap-3 rounded-md border p-4 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
            >
              <Building2 className='mt-0.5 h-5 w-5 shrink-0' />
              <div>
                <div className='font-medium'>SimpleFIN Bridge</div>
                <div className='text-sm text-muted-foreground'>
                  {t('connectBank.simplefinDescription')}
                </div>
              </div>
            </button>
          </div>
        )}

        {step === 'gocardless-country' && (
          <div className='space-y-3'>
            <Button variant='ghost' size='sm' onClick={() => setStep('provider')} className='-ml-2'>
              <ArrowLeft className='mr-1 h-4 w-4' /> {t('connectBank.back')}
            </Button>
            <p className='text-sm text-muted-foreground'>{t('connectBank.whereIsBank')}</p>
            <div className='grid grid-cols-3 gap-2'>
              {GOCARDLESS_COUNTRIES.map((item) => (
                <Button key={item.code} variant='outline' onClick={() => chooseCountry(item.code)}>
                  {countryLabel(item.code)}
                </Button>
              ))}
            </div>
          </div>
        )}

        {step === 'gocardless-institution' && (
          <div className='space-y-3'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setStep('gocardless-country')}
              className='-ml-2'
            >
              <ArrowLeft className='mr-1 h-4 w-4' /> {t('connectBank.back')}
            </Button>
            <p className='text-sm text-muted-foreground'>
              {t('connectBank.banksIn', {
                country: GOCARDLESS_COUNTRIES.some((item) => item.code === country)
                  ? countryLabel(country)
                  : country,
              })}
            </p>
            <div className='relative'>
              <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                autoFocus
                placeholder={t('connectBank.searchBanks')}
                className='pl-8'
                value={institutionSearch}
                onChange={(e) => setInstitutionSearch(e.target.value)}
              />
            </div>
            <div className='max-h-72 space-y-1 overflow-y-auto'>
              {loadingInstitutions && (
                <p className='py-6 text-center text-sm text-muted-foreground'>{t('connectBank.loadingBanks')}</p>
              )}
              {!loadingInstitutions && filteredInstitutions.length === 0 && (
                <p className='py-6 text-center text-sm text-muted-foreground'>{t('connectBank.noBanks')}</p>
              )}
              {filteredInstitutions.map((institution) => (
                <button
                  key={institution.id}
                  type='button'
                  disabled={connectingInstitutionId !== ''}
                  onClick={() => connectGoCardless(institution)}
                  className='flex w-full items-center gap-3 rounded-md p-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {institution.logo ? (
                    <img src={institution.logo} alt='' className='h-6 w-6 rounded' />
                  ) : (
                    <Landmark className='h-6 w-6 text-muted-foreground' />
                  )}
                  <span className='flex-1'>{institution.name}</span>
                  {connectingInstitutionId === institution.id && (
                    <span className='text-xs text-muted-foreground'>{t('connectBank.connecting')}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'simplefin-token' && (
          <div className='space-y-3'>
            <Button variant='ghost' size='sm' onClick={() => setStep('provider')} className='-ml-2'>
              <ArrowLeft className='mr-1 h-4 w-4' /> {t('connectBank.back')}
            </Button>
            <div className='space-y-2'>
              <Label htmlFor='simplefin-setup-token'>{t('connectBank.tokenLabel')}</Label>
              <Textarea
                id='simplefin-setup-token'
                placeholder={t('connectBank.tokenPlaceholder')}
                value={setupToken}
                onChange={(e) => setSetupToken(e.target.value)}
                rows={4}
              />
              <p className='text-xs text-muted-foreground'>
                {t('connectBank.tokenHint')}
              </p>
            </div>
            <Button onClick={connectSimplefin} disabled={connectingSimplefin} className='w-full'>
              {connectingSimplefin ? t('connectBank.connecting') : t('connectBank.connect')}
            </Button>
          </div>
        )}

        {step === 'mapping' && connection && (
          <MapDiscoveredAccounts
            connection={connection}
            existingAccounts={existingAccounts}
            onMapped={onLinked}
            onDone={() => {
              onLinked?.()
              onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
