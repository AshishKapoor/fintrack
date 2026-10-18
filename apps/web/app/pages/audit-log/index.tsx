'use client'

import { httpPFTClient } from '@/client/httpPFTClient'
import { useV1AuditLogList } from '@/client/gen/pft/v1/v1'
import { LoadError } from '@/components/load-error'
import { AnimateSpinner } from '@/components/spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyPlaceholder } from '@/components/ui/empty-placeholder'
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
import Typography from '@/components/ui/typography'
import { useOrganization } from '@/context/organization-context'
import { formatDateForApi } from '@/lib/date'
import { downloadFile } from '@/lib/export'
import { format } from 'date-fns'
import { Download, History, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'

// The backend does not constrain entity_type to an enum (it is whatever
// model recorded the change), so this list is curated from the entity types
// pft/audit.py's call sites actually produce - see ARCHITECTURE.md's audit
// section. "All types" always remains a safe superset.
const ENTITY_TYPES = [
  'Account',
  'BudgetFile',
  'BudgetMonth',
  'Category',
  'CategoryGroup',
  'EnvelopeAssignment',
  'Invitation',
  'LedgerTransaction',
  'Membership',
  'Payee',
  'SavedReport',
  'ScheduledTransaction',
  'Tag',
  'TransactionRule',
] as const

const ACTION_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  created: 'default',
  updated: 'secondary',
  deleted: 'destructive',
}

export default function AuditLogPage() {
  const { t } = useTranslation()
  const { activeOrg } = useOrganization()
  const [page, setPage] = useState(1)
  const [action, setAction] = useState<'all' | 'created' | 'updated' | 'deleted'>('all')
  const [entityType, setEntityType] = useState<'all' | (typeof ENTITY_TYPES)[number]>('all')

  // Mirrors workspace-settings.tsx: audit history is a shared-workspace
  // concept, and only owners/admins may browse who did what - viewers and
  // members get an empty list from the API regardless (see audit_views.py),
  // so short-circuiting here just avoids a doomed request and a confusing
  // "no activity" screen for people it was never going to show anything to.
  const org = activeOrg && !activeOrg.personal ? activeOrg : null
  const canManage = org !== null && (org.my_role === 'owner' || org.my_role === 'admin')

  const { data, isLoading, error: auditError, mutate: retryAudit } = useV1AuditLogList(
    org && canManage
      ? {
          page,
          // organization/entity_type/action are real, working query params
          // the endpoint supports beyond the generated params type (see
          // audit_views.py) - same smuggling precedent as transactions/index.tsx.
          ...({ organization: org.id } as object),
          ...(action !== 'all' ? ({ action } as object) : {}),
          ...(entityType !== 'all' ? ({ entity_type: entityType } as object) : {}),
        }
      : undefined,
    { swr: { enabled: Boolean(org && canManage) } },
  )

  if (!org || !canManage) {
    return (
      <div className='p-6'>
        <EmptyPlaceholder
          icon={<ShieldAlert className='w-12 h-12' />}
          title={t('auditLog.unavailableTitle')}
          description={
            !activeOrg || activeOrg.personal
              ? t('auditLog.unavailablePersonal')
              : t('auditLog.unavailableNoPermission')
          }
        />
      </div>
    )
  }

  const exportCsv = async () => {
    try {
      const csv = await httpPFTClient<string>({
        url: '/api/v1/audit-log/export/',
        method: 'GET',
        params: {
          organization: org.id,
          ...(action !== 'all' ? { action } : {}),
          ...(entityType !== 'all' ? { entity_type: entityType } : {}),
        },
      })
      downloadFile(csv, `fintrack-audit-log-${formatDateForApi(new Date())}.csv`, 'text/csv;charset=utf-8')
      toast.success(t('auditLog.exported'))
    } catch {
      toast.error(t('auditLog.exportFailed'))
    }
  }

  return (
    <div className='space-y-4 p-6'>
      <div className='flex items-center justify-between'>
        <div>
          <Typography variant='h2' as='h1'>{t('auditLog.title')}</Typography>
          <p className='text-sm text-muted-foreground'>
            <Trans
              i18nKey='auditLog.subtitle'
              values={{ name: org.name }}
              components={{ strong: <strong /> }}
            />
          </p>
        </div>
        <Button variant='outline' onClick={() => void exportCsv()}>
          <Download className='mr-2 h-4 w-4' />
          {t('auditLog.exportCsv')}
        </Button>
      </div>

      <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
        <Select value={action} onValueChange={(value) => { setAction(value as typeof action); setPage(1) }}>
          <SelectTrigger className='w-[160px]'>
            <SelectValue placeholder={t('auditLog.action')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>{t('auditLog.allActions')}</SelectItem>
            <SelectItem value='created'>{t('auditLog.created')}</SelectItem>
            <SelectItem value='updated'>{t('auditLog.updated')}</SelectItem>
            <SelectItem value='deleted'>{t('auditLog.deleted')}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={entityType}
          onValueChange={(value) => { setEntityType(value as typeof entityType); setPage(1) }}
        >
          <SelectTrigger className='w-[200px]'>
            <SelectValue placeholder={t('auditLog.type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>{t('auditLog.allTypes')}</SelectItem>
            {ENTITY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <AnimateSpinner size={64} />
      ) : auditError && !data ? (
        <LoadError what={t('loadError.auditLog')} onRetry={() => void retryAudit()} />
      ) : !data?.results?.length ? (
        <EmptyPlaceholder
          icon={<History className='w-12 h-12' />}
          title={t('auditLog.emptyTitle')}
          description={t('auditLog.emptyDescription')}
        />
      ) : (
        <>
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('auditLog.when')}</TableHead>
                  <TableHead>{t('auditLog.who')}</TableHead>
                  <TableHead>{t('auditLog.action')}</TableHead>
                  <TableHead>{t('auditLog.entity')}</TableHead>
                  <TableHead>{t('auditLog.summary')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className='whitespace-nowrap text-sm text-muted-foreground'>
                      {format(new Date(entry.created_at), 'dd MMM yyyy HH:mm')}
                    </TableCell>
                    <TableCell>{entry.actor_email || t('auditLog.system')}</TableCell>
                    <TableCell>
                      <Badge variant={ACTION_BADGE_VARIANT[entry.action] ?? 'outline'}>
                        {entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell className='whitespace-nowrap text-sm text-muted-foreground'>
                      {entry.entity_type}
                      {entry.entity_id ? ` #${entry.entity_id}` : ''}
                    </TableCell>
                    <TableCell>{entry.summary}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className='flex items-center justify-between'>
            <div className='text-sm text-muted-foreground'>
              <Trans
                i18nKey='auditLog.showing'
                values={{ shown: data.results.length, total: data.count }}
                components={{ strong: <strong /> }}
              />
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                disabled={!data.previous}
                onClick={() => setPage((prev) => prev - 1)}
              >
                {t('auditLog.previous')}
              </Button>
              <Button
                variant='outline'
                size='sm'
                disabled={!data.next}
                onClick={() => setPage((prev) => prev + 1)}
              >
                {t('auditLog.next')}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
