import { httpPFTClient } from '@/client/httpPFTClient'
import { BackupManager } from '@/components/backup-manager'
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
import { Building2, DatabaseBackup, Key, User } from 'lucide-react'
import { useEffect, useState } from 'react'

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
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [passwordData, setPasswordData] = useState<PasswordChange>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

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
          title: 'Error',
          description:
            error instanceof AxiosError
              ? error.response?.data?.message || 'Failed to fetch profile data'
              : 'Failed to fetch profile data',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [toast])

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
        title: 'Success',
        description: 'Profile updated successfully',
      })
    } catch (error: unknown) {
      console.error('Failed to update profile:', error)
      toast({
        title: 'Error',
        description:
          error instanceof AxiosError
            ? error.response?.data?.message || 'Failed to update profile'
            : 'Failed to update profile',
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
        title: 'Error',
        description: 'New passwords do not match',
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
        title: 'Success',
        description: 'Password changed successfully',
      })
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
    } catch (error: unknown) {
      console.error('Failed to change password:', error)
      toast({
        title: 'Error',
        description:
          error instanceof AxiosError
            ? error.response?.data?.message || 'Failed to change password'
            : 'Failed to change password',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='p-6'>
      <Typography variant='h2' className='mb-4'>
        Settings
      </Typography>
      {loading && (
        // <div className="flex justify-center items-center my-8">
        //   <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        // </div>
        <AnimateSpinner size={64} />
      )}
      {!loading && profile && (
        <Tabs defaultValue='profile' className='space-y-6'>
          <TabsList className='w-full justify-start p-0'>
            <TabsTrigger value='profile'>
              <User className='mr-2 h-4 w-4' />
              Profile
            </TabsTrigger>
            <TabsTrigger value='account'>
              <Key className='mr-2 h-4 w-4' />
              Account
            </TabsTrigger>
            {/* <TabsTrigger value='notifications'>
              <Bell className='mr-2 h-4 w-4' />
              Notifications
            </TabsTrigger> */}
            <TabsTrigger value='workspace'>
              <Building2 className='mr-2 h-4 w-4' />
              Workspace
            </TabsTrigger>
            <TabsTrigger value='backups'>
              <DatabaseBackup className='mr-2 h-4 w-4' />
              Backups
            </TabsTrigger>
          </TabsList>

          <TabsContent value='profile' className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className='space-y-6'>
                <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label htmlFor='first_name'>First Name</Label>
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
                    <Label htmlFor='last_name'>Last Name</Label>
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
                    <Label htmlFor='phone'>Phone Number</Label>
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
                    <Label htmlFor='location'>Location</Label>
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
                    <Label htmlFor='bio'>Bio</Label>
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
                  {loading ? 'Saving...' : 'Save Profile'}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Work Information</CardTitle>
                <CardDescription>Update your work details</CardDescription>
              </CardHeader>
              <CardContent className='space-y-6'>
                <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label htmlFor='department'>Department</Label>
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
                    <Label htmlFor='role'>Role</Label>
                    <Input id='role' value={profile?.role || ''} disabled />
                  </div>
                </div>
              </CardContent>
              <CardFooter className='flex justify-end'>
                <Button onClick={() => updateProfile(profile!)} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Work Info'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value='account' className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password</CardDescription>
              </CardHeader>
              <form onSubmit={changePassword}>
                <CardContent className='space-y-6'>
                  <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                    <div className='space-y-2'>
                      <Label htmlFor='current-password'>Current Password</Label>
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
                      <Label htmlFor='new-password'>New Password</Label>
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
                      <Label htmlFor='confirm-password'>Confirm New Password</Label>
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
                    {loading ? 'Updating...' : 'Update Password'}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-destructive'>Danger Zone</CardTitle>
                <CardDescription>Irreversible account actions</CardDescription>
              </CardHeader>
              <CardContent className='space-y-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='font-medium'>Delete Account</h3>
                    <p className='text-sm text-muted-foreground'>
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <DeleteAccountDialog />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* <TabsContent value='notifications' className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>Manage your email notification preferences</CardDescription>
              </CardHeader>
              <CardContent className='space-y-6'>
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h3 className='font-medium'>Project Updates</h3>
                      <p className='text-sm text-muted-foreground'>
                        Receive emails about project changes and updates
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h3 className='font-medium'>Account Alerts</h3>
                      <p className='text-sm text-muted-foreground'>
                        Security and account-related notifications
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
              <CardFooter className='flex justify-end'>
                <Button>Save Preferences</Button>
              </CardFooter>
            </Card>
          </TabsContent> */}
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
