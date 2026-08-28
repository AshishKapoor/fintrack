import { httpPFTClient } from '@/client/httpPFTClient'
import { BackupManager } from '@/components/backup-manager'
import { NotificationSettings } from '@/components/notification-settings'
import { AiCategorizationSettings } from '@/components/ai-categorization-settings'
import { WorkspaceSettings } from '@/components/workspace-settings'
import { DeleteAccountDialog } from '@/components/delete-account-dialog'
import { AnimateSpinner } from '@/components/spinner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import Typography from '@/components/ui/typography'
import { useToast } from '@/hooks/use-toast'
import { AxiosError } from 'axios'
import { Bell, Bot, Building2, DatabaseBackup, Key, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

interface UserProfile {
  id: number
  email: string
  first_name: string
  last_name: string
  phone_number: string
  location: string
  bio: string
  department: string
  role: string
}

interface PasswordChange {
  current_password: string
  new_password: string
  confirm_password: string
}

export default function UserSettingsPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [passwordData, setPasswordData] = useState<PasswordChange>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const requestedTab = searchParams.get('tab')
  const defaultTab =
    requestedTab && ['profile', 'account', 'notifications', 'workspace', 'backups'].includes(requestedTab)
      ? requestedTab
      : 'profile'

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      try {
        const response = await httpPFTClient<UserProfile>({
          url: '/api/v1/me/',
          method: 'GET',
        })
        setProfile(response)
      } catch (error: unknown) {
        console.error('Failed to fetch profile:', error)
        toast({
          title: t('common.error'),
          description:
            error instanceof AxiosError
              ? error.response?.data?.message || t('settings.profile.fetchError')
              : t('settings.profile.fetchError'),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [toast, t])

  const updateProfile = async (formData: Partial<UserProfile>) => {
    setLoading(true)
    try {
      const response = await httpPFTClient<UserProfile>({
        url: '/api/v1/profile/update/',
        method: 'PUT',
        data: formData,
      })
      setProfile(response)
      toast({
        title: t('common.success'),
        description: t('settings.profile.updateSuccess'),
      })
    } catch (error: unknown) {
      console.error('Failed to update profile:', error)
      toast({
        title: t('common.error'),
        description:
          error instanceof AxiosError
            ? error.response?.data?.message || t('settings.profile.updateError')
            : t('settings.profile.updateError'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast({
        title: t('common.error'),
        description: t('settings.account.passwordMismatch'),
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await httpPFTClient({
        url: '/api/v1/profile/change-password/',
        method: 'POST',
        data: {
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
          confirm_password: passwordData.confirm_password,
        },
      })
      toast({
        title: t('common.success'),
        description: t('settings.account.passwordSuccess'),
      })
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
    } catch (error: unknown) {
      console.error('Failed to change password:', error)
      toast({
        title: t('common.error'),
        description:
          error instanceof AxiosError
            ? error.response?.data?.message || t('settings.account.passwordError')
            : t('settings.account.passwordError'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='p-6'>
      <Typography variant='h2' className='mb-4'>
        {t('settings.title')}
      </Typography>
      {loading && <AnimateSpinner size={64} />}
      {!loading && profile && (
        <Tabs defaultValue={defaultTab} className='space-y-6'>
          <TabsList className='w-full justify-start p-0'>
            <TabsTrigger value='profile'>
              <User className='mr-2 h-4 w-4' />
              {t('settings.tabs.profile')}
            </TabsTrigger>
            <TabsTrigger value='account'>
              <Key className='mr-2 h-4 w-4' />
              {t('settings.tabs.account')}
            </TabsTrigger>
            <TabsTrigger value='notifications'>
              <Bell className='mr-2 h-4 w-4' />
              {t('settings.tabs.notifications')}
            </TabsTrigger>
            <TabsTrigger value='ai-categorization'>
              <Bot className='mr-2 h-4 w-4' />
              {t('settings.tabs.aiCategorization')}
            </TabsTrigger>
            <TabsTrigger value='workspace'>
              <Building2 className='mr-2 h-4 w-4' />
              {t('settings.tabs.workspace')}
            </TabsTrigger>
            <TabsTrigger value='backups'>
              <DatabaseBackup className='mr-2 h-4 w-4' />
              {t('settings.tabs.backups')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value='profile' className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.profile.infoTitle')}</CardTitle>
                <CardDescription>{t('settings.profile.infoDescription')}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-6'>
                <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label htmlFor='first_name'>{t('settings.profile.firstName')}</Label>
                    <Input
                      id='first_name'
                      value={profile?.first_name || ''}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev!,
                          first_name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='last_name'>{t('settings.profile.lastName')}</Label>
                    <Input
                      id='last_name'
                      value={profile?.last_name || ''}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev!,
                          last_name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='phone_number'>{t('settings.profile.phone')}</Label>
                    <Input
                      id='phone_number'
                      value={profile?.phone_number || ''}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev!,
                          phone_number: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='location'>{t('settings.profile.location')}</Label>
                    <Input
                      id='location'
                      value={profile?.location || ''}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev!,
                          location: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className='space-y-2 md:col-span-2'>
                    <Label htmlFor='bio'>{t('settings.profile.bio')}</Label>
                    <Textarea
                      id='bio'
                      rows={4}
                      value={profile?.bio || ''}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev!,
                          bio: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className='flex justify-end'>
                <Button onClick={() => updateProfile(profile!)} disabled={loading}>
                  {loading ? t('common.saving') : t('settings.profile.saveProfile')}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('settings.profile.workTitle')}</CardTitle>
                <CardDescription>{t('settings.profile.workDescription')}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-6'>
                <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label htmlFor='department'>{t('settings.profile.department')}</Label>
                    <Select
                      value={profile?.department || ''}
                      onValueChange={(value) =>
                        setProfile((prev) => ({
                          ...prev!,
                          department: value,
                        }))
                      }
                    >
                      <SelectTrigger id='department'>
                        <SelectValue placeholder='Select department' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='engineering'>Engineering</SelectItem>
                        <SelectItem value='finance'>Finance</SelectItem>
                        <SelectItem value='hr'>HR</SelectItem>
                        <SelectItem value='marketing'>Marketing</SelectItem>
                        <SelectItem value='sales'>Sales</SelectItem>
                        <SelectItem value='other'>Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='role'>{t('settings.profile.role')}</Label>
                    <Input id='role' value={profile?.role || ''} disabled />
                  </div>
                </div>
              </CardContent>
              <CardFooter className='flex justify-end'>
                <Button onClick={() => updateProfile(profile!)} disabled={loading}>
                  {loading ? t('common.saving') : t('settings.profile.saveWorkInfo')}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value='account' className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.account.changePasswordTitle')}</CardTitle>
                <CardDescription>{t('settings.account.changePasswordDescription')}</CardDescription>
              </CardHeader>
              <form onSubmit={changePassword}>
                <CardContent className='space-y-6'>
                  <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                    <div className='space-y-2'>
                      <Label htmlFor='current-password'>
                        {t('settings.account.currentPassword')}
                      </Label>
                      <Input
                        id='current-password'
                        type='password'
                        value={passwordData.current_password}
                        onChange={(e) =>
                          setPasswordData((prev) => ({
                            ...prev,
                            current_password: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='new-password'>{t('settings.account.newPassword')}</Label>
                      <Input
                        id='new-password'
                        type='password'
                        value={passwordData.new_password}
                        onChange={(e) =>
                          setPasswordData((prev) => ({
                            ...prev,
                            new_password: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='confirm-password'>
                        {t('settings.account.confirmPassword')}
                      </Label>
                      <Input
                        id='confirm-password'
                        type='password'
                        value={passwordData.confirm_password}
                        onChange={(e) =>
                          setPasswordData((prev) => ({
                            ...prev,
                            confirm_password: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className='flex justify-end'>
                  <Button type='submit' disabled={loading}>
                    {loading ? t('settings.account.updating') : t('settings.account.updatePassword')}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-destructive'>
                  {t('settings.account.dangerZoneTitle')}
                </CardTitle>
                <CardDescription>{t('settings.account.dangerZoneDescription')}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='font-medium'>{t('settings.account.deleteAccountTitle')}</h3>
                    <p className='text-sm text-muted-foreground'>
                      {t('settings.account.deleteAccountDescription')}
                    </p>
                  </div>
                  <DeleteAccountDialog />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='notifications' className='space-y-6'>
            <NotificationSettings email={profile.email} />
          </TabsContent>

          <TabsContent value='ai-categorization' className='space-y-6'>
            <AiCategorizationSettings />
          </TabsContent>

          <TabsContent value='workspace' className='space-y-6'>
            <WorkspaceSettings />
          </TabsContent>

          <TabsContent value='backups' className='space-y-6'>
            <BackupManager />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
