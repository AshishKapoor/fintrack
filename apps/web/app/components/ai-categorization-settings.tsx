'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import useSWR from 'swr'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getAICategorizationSettings,
  setAICategorizationApiKey,
  testAICategorizationConnection,
  updateAICategorizationSettings,
  type AICategorizationSettings as Settings,
} from '@/lib/finance-client'

type Draft = Pick<Settings, 'is_enabled' | 'provider' | 'base_url' | 'model_name'>

/**
 * The AI categorization settings tab - ROADMAP.md Phase 3, "opt-in...off by
 * default, privacy-framed, never required". Mirrors NotificationSettings'
 * draft/save shape exactly (pft/notifications.py's UI counterpart): local
 * edits accumulate in `draft` until an explicit Save, while the API key has
 * its own separate write path since it's a credential, not a preference -
 * see AICategorizationApiKeyView and this component's own submitApiKey.
 */
export function AiCategorizationSettings() {
  const { t } = useTranslation()
  const { data, isLoading, mutate } = useSWR('ai-categorization-settings', () =>
    getAICategorizationSettings(),
  )
  const [draft, setDraftState] = useState<Draft | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [settingKey, setSettingKey] = useState(false)
  const [testing, setTesting] = useState(false)

  const settings = draft ?? (data as Draft | undefined)

  const update = (patch: Partial<Draft>) => {
    setDraftState({ ...(settings as Draft), ...patch })
  }

  const save = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const saved = await updateAICategorizationSettings(settings)
      setDraftState(null)
      await mutate(saved, { revalidate: false })
      toast.success(t('aiCategorizationSettings.saveSuccess'))
    } catch {
      toast.error(t('aiCategorizationSettings.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const submitApiKey = async () => {
    if (!apiKeyInput.trim()) return
    setSettingKey(true)
    try {
      const saved = await setAICategorizationApiKey(apiKeyInput.trim())
      setApiKeyInput('')
      await mutate(saved, { revalidate: false })
      toast.success(t('aiCategorizationSettings.apiKeySaved'))
    } catch {
      toast.error(t('aiCategorizationSettings.saveError'))
    } finally {
      setSettingKey(false)
    }
  }

  const clearApiKey = async () => {
    setSettingKey(true)
    try {
      const saved = await setAICategorizationApiKey('')
      await mutate(saved, { revalidate: false })
      toast.success(t('aiCategorizationSettings.apiKeyCleared'))
    } finally {
      setSettingKey(false)
    }
  }

  const runTest = async () => {
    setTesting(true)
    try {
      const result = await testAICategorizationConnection()
      if (result.ok) {
        toast.success(result.detail)
      } else {
        toast.error(result.detail)
      }
    } catch {
      toast.error(t('aiCategorizationSettings.testError'))
    } finally {
      setTesting(false)
    }
  }

  if (isLoading || !settings) {
    return <AnimateSpinner size={64} />
  }

  const isOllama = settings.provider === 'ollama'

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>{t('aiCategorizationSettings.title')}</CardTitle>
          <CardDescription>{t('aiCategorizationSettings.description')}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='font-medium'>{t('aiCategorizationSettings.enable')}</h3>
              <p className='text-sm text-muted-foreground'>
                {t('aiCategorizationSettings.privacyNote')}
              </p>
            </div>
            <Switch
              aria-label={t('aiCategorizationSettings.enable')}
              checked={settings.is_enabled}
              onCheckedChange={(checked) => update({ is_enabled: checked })}
            />
          </div>

          {settings.is_enabled && (
            <div className='space-y-4 pl-1'>
              <div className='grid gap-2'>
                <Label htmlFor='ai-provider'>{t('aiCategorizationSettings.provider')}</Label>
                <Select
                  value={settings.provider}
                  onValueChange={(value) => update({ provider: value as Draft['provider'] })}
                >
                  <SelectTrigger id='ai-provider'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='openai_compatible'>
                      {t('aiCategorizationSettings.providerOpenai')}
                    </SelectItem>
                    <SelectItem value='ollama'>{t('aiCategorizationSettings.providerOllama')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                <div className='grid gap-2'>
                  <Label htmlFor='ai-base-url'>{t('aiCategorizationSettings.baseUrl')}</Label>
                  <Input
                    id='ai-base-url'
                    value={settings.base_url}
                    onChange={(e) => update({ base_url: e.target.value })}
                    placeholder={
                      isOllama
                        ? t('aiCategorizationSettings.baseUrlPlaceholderOllama')
                        : t('aiCategorizationSettings.baseUrlPlaceholderOpenai')
                    }
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='ai-model'>{t('aiCategorizationSettings.model')}</Label>
                  <Input
                    id='ai-model'
                    value={settings.model_name}
                    onChange={(e) => update({ model_name: e.target.value })}
                    placeholder={
                      isOllama
                        ? t('aiCategorizationSettings.modelPlaceholderOllama')
                        : t('aiCategorizationSettings.modelPlaceholderOpenai')
                    }
                  />
                </div>
              </div>

              {!isOllama && (
                <div className='grid gap-2'>
                  <Label htmlFor='ai-api-key'>{t('aiCategorizationSettings.apiKey')}</Label>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Input
                      id='ai-api-key'
                      type='password'
                      autoComplete='off'
                      className='max-w-xs'
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder={t('aiCategorizationSettings.apiKeyPlaceholder')}
                    />
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={settingKey || !apiKeyInput.trim()}
                      onClick={submitApiKey}
                    >
                      {t('aiCategorizationSettings.setApiKey')}
                    </Button>
                    {data?.has_api_key && (
                      <Button
                        variant='ghost'
                        size='sm'
                        disabled={settingKey}
                        onClick={clearApiKey}
                        className='text-destructive hover:text-destructive'
                      >
                        {t('aiCategorizationSettings.clearApiKey')}
                      </Button>
                    )}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    {data?.has_api_key
                      ? t('aiCategorizationSettings.apiKeyConfigured')
                      : t('aiCategorizationSettings.apiKeyNotConfigured')}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className='flex flex-wrap items-center justify-end gap-2'>
          <Button variant='outline' disabled={testing} onClick={runTest}>
            {testing ? t('aiCategorizationSettings.testing') : t('aiCategorizationSettings.testConnection')}
          </Button>
          <Button onClick={save} disabled={saving || !draft}>
            {saving ? t('common.saving') : t('aiCategorizationSettings.savePreferences')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
