import {
  v1OrgsAcceptInvitationCreate,
  v1OrgsInvitationsCreate,
  v1OrgsMembersRetrieve,
  v1OrgsMembersPartialUpdate,
  v1OrgsMembersRemoveDestroy,
  v1OrgsCreate,
} from '@/client/gen/pft/v1/v1'
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
import { useOrganization } from '@/context/organization-context'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import useSWR from 'swr'

const ROLES = ['admin', 'member', 'viewer'] as const

// What each role can do, in a household's words. The stored values (and the
// API's permission checks) are unchanged. Values are catalogue keys,
// translated at render time.
const ROLE_LABELS: Record<string, string> = {
  owner: 'workspace.roles.owner',
  admin: 'workspace.roles.admin',
  member: 'workspace.roles.member',
  viewer: 'workspace.roles.viewer',
}

/**
 * Workspace management: create one, invite people, manage roles.
 *
 * There is no email backend yet, so an invitation's token is shown to the
 * inviter to share out of band, and joining is pasting a token here.
 */
export function WorkspaceSettings() {
  const { t } = useTranslation()
  const roleLabel = (role: string) => (ROLE_LABELS[role] ? t(ROLE_LABELS[role]) : role)
  const { organizations, activeOrg, setActiveOrg, refresh } = useOrganization()
  const [newOrgName, setNewOrgName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<(typeof ROLES)[number]>('member')
  const [issuedToken, setIssuedToken] = useState<string | null>(null)
  const [joinToken, setJoinToken] = useState('')
  const [busy, setBusy] = useState(false)

  const managing = activeOrg && !activeOrg.personal ? activeOrg : null
  const canManage = managing?.my_role === 'owner' || managing?.my_role === 'admin'

  const { data: members, mutate: refreshMembers } = useSWR(
    managing ? ['org-members', managing.id] : null,
    async () =>
      (await v1OrgsMembersRetrieve(String(managing!.id))) as unknown as {
        id: number
        email?: string
        role: string
      }[],
  )

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      toast.success(label)
    } catch (error) {
      console.error(label, 'failed:', error)
      toast.error(t('workspace.failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>{t('workspace.createTitle')}</CardTitle>
          <CardDescription>
            {t('workspace.createDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-wrap items-end gap-3'>
          <div className='grid gap-2'>
            <Label htmlFor='workspace-name'>{t('workspace.name')}</Label>
            <Input
              id='workspace-name'
              value={newOrgName}
              onChange={(event) => setNewOrgName(event.target.value)}
              placeholder={t('workspace.namePlaceholder')}
            />
          </div>
          <Button
            disabled={!newOrgName.trim() || busy}
            onClick={() =>
              run(t('workspace.created'), async () => {
                const created = await v1OrgsCreate({ name: newOrgName.trim() } as never)
                setNewOrgName('')
                await refresh()
                setActiveOrg(created)
              })
            }
          >
            {t('workspace.create')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('workspace.joinTitle')}</CardTitle>
          <CardDescription>{t('workspace.joinDescription')}</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-wrap items-end gap-3'>
          <div className='grid gap-2 grow max-w-md'>
            <Label htmlFor='join-token'>{t('workspace.invitationCode')}</Label>
            <Input
              id='join-token'
              value={joinToken}
              onChange={(event) => setJoinToken(event.target.value)}
            />
          </div>
          <Button
            disabled={!joinToken.trim() || busy}
            onClick={() =>
              run(t('workspace.joined'), async () => {
                await v1OrgsAcceptInvitationCreate({ token: joinToken.trim() } as never)
                setJoinToken('')
                await refresh()
              })
            }
          >
            {t('workspace.join')}
          </Button>
        </CardContent>
      </Card>

      {managing && (
        <Card>
          <CardHeader>
            <CardTitle>{t('workspace.membersTitle', { name: managing.name })}</CardTitle>
            <CardDescription>
              {t('workspace.membersDescription', { role: roleLabel(managing.my_role) })}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            {canManage && (
              <div className='flex flex-wrap items-end gap-3'>
                <div className='grid gap-2 grow max-w-xs'>
                  <Label htmlFor='invite-email'>{t('workspace.inviteEmail')}</Label>
                  <Input
                    id='invite-email'
                    type='email'
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='invite-role'>{t('workspace.inviteRole')}</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value) => setInviteRole(value as (typeof ROLES)[number])}
                  >
                    <SelectTrigger id='invite-role' className='w-32'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleLabel(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  disabled={!inviteEmail.trim() || busy}
                  onClick={() =>
                    run(t('workspace.invitationCreated'), async () => {
                      const invitation = (await v1OrgsInvitationsCreate(
                        String(managing.id),
                        { email: inviteEmail.trim(), role: inviteRole } as never,
                      )) as unknown as { token: string }
                      setIssuedToken(invitation.token)
                      setInviteEmail('')
                    })
                  }
                >
                  {t('workspace.invite')}
                </Button>
              </div>
            )}

            {issuedToken && (
              <p className='text-sm rounded-md border p-3 font-mono break-all' data-testid='invite-token'>
                {issuedToken}
              </p>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('workspace.person')}</TableHead>
                  <TableHead>{t('workspace.can')}</TableHead>
                  {canManage && <TableHead className='text-right'>{t('workspace.actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(members ?? []).map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{(member as { email?: string }).email}</TableCell>
                    <TableCell>{roleLabel(member.role)}</TableCell>
                    {canManage && (
                      <TableCell className='text-right space-x-2'>
                        {member.role !== 'owner' && (
                          <>
                            <Select
                              value={member.role}
                              onValueChange={(value) =>
                                run(t('workspace.updated'), async () => {
                                  await v1OrgsMembersPartialUpdate(
                                    String(managing.id),
                                    String(member.id),
                                    { role: value } as never,
                                  )
                                  await refreshMembers()
                                })
                              }
                            >
                              <SelectTrigger className='w-40 inline-flex'>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {roleLabel(role)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant='outline'
                              size='sm'
                              disabled={busy}
                              onClick={() =>
                                run(t('workspace.removed'), async () => {
                                  await v1OrgsMembersRemoveDestroy(
                                    String(managing.id),
                                    String(member.id),
                                  )
                                  await refreshMembers()
                                })
                              }
                            >
                              {t('workspace.remove')}
                            </Button>
                          </>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!managing && organizations.length > 0 && (
        <p className='text-sm text-muted-foreground'>
          {t('workspace.switchHint')}
        </p>
      )}
    </div>
  )
}
