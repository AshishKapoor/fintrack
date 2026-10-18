import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useOrganization } from '@/context/organization-context'
import { Check, User, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** Which organization the UI is working in. Lives in the top bar. */
export function OrgSwitcher() {
  const { t } = useTranslation()
  const { organizations, activeOrg, setActiveOrg } = useOrganization()

  if (organizations.length < 2) {
    // Only the personal org: a switcher would be noise.
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='sm' className='gap-2'>
          {activeOrg?.personal ? (
            <User className='h-4 w-4' aria-hidden='true' />
          ) : (
            <Users className='h-4 w-4' aria-hidden='true' />
          )}
          <span className='max-w-32 truncate'>{activeOrg?.name ?? t('orgSwitcher.household')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-56'>
        <DropdownMenuLabel>{t('orgSwitcher.households')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem key={org.id} onClick={() => setActiveOrg(org)}>
            {org.personal ? (
              <User className='mr-2 h-4 w-4' aria-hidden='true' />
            ) : (
              <Users className='mr-2 h-4 w-4' aria-hidden='true' />
            )}
            <span className='flex-1 truncate'>{org.name}</span>
            {activeOrg?.id === org.id && <Check className='ml-2 h-4 w-4' aria-hidden='true' />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
