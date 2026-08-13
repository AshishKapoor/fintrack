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
import { toast } from 'sonner'
import useSWR from 'swr'

const ROLES = ['admin', 'member', 'viewer'] as const

/**
 * Workspace management: create one, invite people, manage roles.
 *
 * There is no email backend yet, so an invitation's token is shown to the
 * inviter to share out of band, and joining is pasting a token here.
 */
export function WorkspaceSettings() {
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
      toast.error('That did not work.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Create a workspace</CardTitle>
          <CardDescription>
            A shared space for a household, a team, or a client. You become its owner.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-wrap items-end gap-3'>
          <div className='grid gap-2'>
            <Label htmlFor='workspace-name'>Name</Label>
            <Input
              id='workspace-name'
              value={newOrgName}
              onChange={(event) => setNewOrgName(event.target.value)}
              placeholder='e.g. Family finances'
            />
          </div>
          <Button
            disabled={!newOrgName.trim() || busy}
            onClick={() =>
              run('Workspace created', async () => {
                const created = await v1OrgsCreate({ name: newOrgName.trim() } as never)
                setNewOrgName('')
                await refresh()
                setActiveOrg(created)
              })
            }
          >
            Create workspace
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Join a workspace</CardTitle>
          <CardDescription>Paste the invitation token you were sent.</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-wrap items-end gap-3'>
          <div className='grid gap-2 grow max-w-md'>
            <Label htmlFor='join-token'>Invitation token</Label>
            <Input
              id='join-token'
              value={joinToken}
              onChange={(event) => setJoinToken(event.target.value)}
            />
          </div>
          <Button
            disabled={!joinToken.trim() || busy}
            onClick={() =>
              run('Joined the workspace', async () => {
                await v1OrgsAcceptInvitationCreate({ token: joinToken.trim() } as never)
                setJoinToken('')
                await refresh()
              })
            }
          >
            Join
          </Button>
        </CardContent>
      </Card>

      {managing && (
        <Card>
          <CardHeader>
            <CardTitle>{managing.name} — members</CardTitle>
            <CardDescription>
              Your role: {managing.my_role}. Viewers can read everything and change nothing.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            {canManage && (
              <div className='flex flex-wrap items-end gap-3'>
                <div className='grid gap-2 grow max-w-xs'>
                  <Label htmlFor='invite-email'>Invite by email</Label>
                  <Input
                    id='invite-email'
                    type='email'
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='invite-role'>Role</Label>
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
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  disabled={!inviteEmail.trim() || busy}
                  onClick={() =>
                    run('Invitation created', async () => {
                      const invitation = (await v1OrgsInvitationsCreate(
                        String(managing.id),
                        { email: inviteEmail.trim(), role: inviteRole } as never,
                      )) as unknown as { token: string }
                      setIssuedToken(invitation.token)
                      setInviteEmail('')
                    })
                  }
                >
                  Invite
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
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  {canManage && <TableHead className='text-right'>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(members ?? []).map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{(member as { email?: string }).email}</TableCell>
                    <TableCell>{member.role}</TableCell>
                    {canManage && (
                      <TableCell className='text-right space-x-2'>
                        {member.role !== 'owner' && (
                          <>
                            <Select
                              value={member.role}
                              onValueChange={(value) =>
                                run('Role updated', async () => {
                                  await v1OrgsMembersPartialUpdate(
                                    String(managing.id),
                                    String(member.id),
                                    { role: value } as never,
                                  )
                                  await refreshMembers()
                                })
                              }
                            >
                              <SelectTrigger className='w-28 inline-flex'>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {role}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant='outline'
                              size='sm'
                              disabled={busy}
                              onClick={() =>
                                run('Member removed', async () => {
                                  await v1OrgsMembersRemoveDestroy(
                                    String(managing.id),
                                    String(member.id),
                                  )
                                  await refreshMembers()
                                })
                              }
                            >
                              Remove
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
          Switch to a shared workspace in the top bar to manage its members.
        </p>
      )}
    </div>
  )
}
