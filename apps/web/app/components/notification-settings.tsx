import {
  useV1NotificationsPreferencesRetrieve,
  v1NotificationsPreferencesPartialUpdate,
  v1NotificationsTestCreate,
} from '@/client/gen/pft/v1/v1'
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
import { AnimateSpinner } from '@/components/spinner'
import { Switch } from '@/components/ui/switch'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

type Preferences = {
  email_enabled: boolean
  ntfy_enabled: boolean
  ntfy_server_url: string
  ntfy_topic: string
  webhook_enabled: boolean
  webhook_url: string
  budget_alerts_enabled: boolean
  budget_alert_threshold: number
  reminders_enabled: boolean
  reminder_days_before: number
  weekly_digest_enabled: boolean
}

/**
 * The Notifications settings tab: pick delivery channels (email / ntfy /
 * webhook, all off by default - nothing is sent until one is turned on) and
 * which alerts to receive. See pft/notifications.py for what actually
 * triggers a send; this is purely the preferences UI plus a test-send button.
 */
export function NotificationSettings({ email }: { email: string }) {
  const { t } = useTranslation()
  const { data, isLoading, mutate } = useV1NotificationsPreferencesRetrieve()
  const [draft, setDraft] = useState<Preferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const preferences = draft ?? (data as Preferences | undefined)

  const update = (patch: Partial<Preferences>) => {
    setDraft({ ...(preferences as Preferences), ...patch })
  }

  const save = async () => {
    if (!preferences) return
    setSaving(true)
    try {
      const saved = await v1NotificationsPreferencesPartialUpdate(preferences as never)
      setDraft(null)
      await mutate(saved as never, { revalidate: false })
      toast.success(t('notificationsSettings.saveSuccess'))
    } catch {
      toast.error(t('notificationsSettings.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const sendTest = async () => {
    setTesting(true)
    try {
      await v1NotificationsTestCreate()
      toast.success(t('notificationsSettings.testSuccess'))
    } catch {
      toast.error(t('notificationsSettings.testError'))
    } finally {
      setTesting(false)
    }
  }

  if (isLoading || !preferences) {
    return <AnimateSpinner size={64} />
  }

  const noChannelEnabled =
    !preferences.email_enabled && !preferences.ntfy_enabled && !preferences.webhook_enabled

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>{t('notificationsSettings.channelsTitle')}</CardTitle>
          <CardDescription>{t('notificationsSettings.channelsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='font-medium'>{t('notificationsSettings.email')}</h3>
              <p className='text-sm text-muted-foreground'>
                {t('notificationsSettings.emailDescription', { email })}
              </p>
            </div>
            <Switch
              aria-label={t('notificationsSettings.email')}
              checked={preferences.email_enabled}
              onCheckedChange={(checked) => update({ email_enabled: checked })}
            />
          </div>

          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-medium'>{t('notificationsSettings.ntfy')}</h3>
                <p className='text-sm text-muted-foreground'>
                  {t('notificationsSettings.ntfyDescription')}
                </p>
              </div>
              <Switch
                aria-label={t('notificationsSettings.ntfy')}
                checked={preferences.ntfy_enabled}
                onCheckedChange={(checked) => update({ ntfy_enabled: checked })}
              />
            </div>
            {preferences.ntfy_enabled && (
              <div className='grid grid-cols-1 gap-3 pl-1 md:grid-cols-2'>
                <div className='grid gap-2'>
                  <Label htmlFor='ntfy-server'>{t('notificationsSettings.ntfyServerUrl')}</Label>
                  <Input
                    id='ntfy-server'
                    value={preferences.ntfy_server_url}
                    onChange={(e) => update({ ntfy_server_url: e.target.value })}
                    placeholder='https://ntfy.sh'
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='ntfy-topic'>{t('notificationsSettings.ntfyTopic')}</Label>
                  <Input
                    id='ntfy-topic'
                    value={preferences.ntfy_topic}
                    onChange={(e) => update({ ntfy_topic: e.target.value })}
                    placeholder='fintrack-alerts'
                  />
                </div>
              </div>
            )}
          </div>

          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='font-medium'>{t('notificationsSettings.webhook')}</h3>
                <p className='text-sm text-muted-foreground'>
                  {t('notificationsSettings.webhookDescription')}
                </p>
              </div>
              <Switch
                aria-label={t('notificationsSettings.webhook')}
                checked={preferences.webhook_enabled}
                onCheckedChange={(checked) => update({ webhook_enabled: checked })}
              />
            </div>
            {preferences.webhook_enabled && (
              <div className='grid gap-2 pl-1'>
                <Label htmlFor='webhook-url'>{t('notificationsSettings.webhookUrl')}</Label>
                <Input
                  id='webhook-url'
                  value={preferences.webhook_url}
                  onChange={(e) => update({ webhook_url: e.target.value })}
                  placeholder='https://example.com/hooks/fintrack'
                />
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className='flex flex-wrap items-center justify-end gap-2'>
          <Button
            variant='outline'
            disabled={testing || noChannelEnabled}
            title={noChannelEnabled ? t('notificationsSettings.noChannelEnabled') : undefined}
            onClick={sendTest}
          >
            {testing ? t('notificationsSettings.sending') : t('notificationsSettings.sendTest')}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('notificationsSettings.alertsTitle')}</CardTitle>
          <CardDescription>{t('notificationsSettings.alertsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='flex items-center justify-between gap-4'>
            <div>
              <h3 className='font-medium'>{t('notificationsSettings.budgetAlerts')}</h3>
              <p className='text-sm text-muted-foreground'>
                {t('notificationsSettings.budgetAlertsDescription')}
              </p>
            </div>
            <div className='flex items-center gap-2'>
              {preferences.budget_alerts_enabled && (
                <div className='flex items-center gap-1'>
                  <Input
                    type='number'
                    min={1}
                    max={100}
                    className='w-16'
                    aria-label={t('notificationsSettings.budgetThreshold')}
                    value={preferences.budget_alert_threshold}
                    onChange={(e) =>
                      update({ budget_alert_threshold: Number(e.target.value) })
                    }
                  />
                  <span className='text-sm text-muted-foreground'>%</span>
                </div>
              )}
              <Switch
                aria-label={t('notificationsSettings.budgetAlerts')}
                checked={preferences.budget_alerts_enabled}
                onCheckedChange={(checked) => update({ budget_alerts_enabled: checked })}
              />
            </div>
          </div>

          <div className='flex items-center justify-between gap-4'>
            <div>
              <h3 className='font-medium'>{t('notificationsSettings.reminders')}</h3>
              <p className='text-sm text-muted-foreground'>
                {t('notificationsSettings.remindersDescription')}
              </p>
            </div>
            <div className='flex items-center gap-2'>
              {preferences.reminders_enabled && (
                <div className='flex items-center gap-1'>
                  <Input
                    type='number'
                    min={0}
                    max={30}
                    className='w-16'
                    aria-label={t('notificationsSettings.reminderDays')}
                    value={preferences.reminder_days_before}
                    onChange={(e) =>
                      update({ reminder_days_before: Number(e.target.value) })
                    }
                  />
                  <span className='text-sm text-muted-foreground'>
                    {t('notificationsSettings.reminderDays')}
                  </span>
                </div>
              )}
              <Switch
                aria-label={t('notificationsSettings.reminders')}
                checked={preferences.reminders_enabled}
                onCheckedChange={(checked) => update({ reminders_enabled: checked })}
              />
            </div>
          </div>

          <div className='flex items-center justify-between'>
            <div>
              <h3 className='font-medium'>{t('notificationsSettings.weeklyDigest')}</h3>
              <p className='text-sm text-muted-foreground'>
                {t('notificationsSettings.weeklyDigestDescription')}
              </p>
            </div>
            <Switch
              aria-label={t('notificationsSettings.weeklyDigest')}
              checked={preferences.weekly_digest_enabled}
              onCheckedChange={(checked) => update({ weekly_digest_enabled: checked })}
            />
          </div>
        </CardContent>
        <CardFooter className='flex justify-end'>
          <Button onClick={save} disabled={saving || !draft}>
            {saving ? t('common.saving') : t('notificationsSettings.savePreferences')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
