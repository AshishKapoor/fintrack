import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link } from 'react-router-dom'
import { login, LoginError } from '@/lib/auth'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

export function LoginPage() {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      await login(email, password)
      navigate('/home')
    } catch (err) {
      if (err instanceof LoginError && err.kind === 'invalid') {
        setError(t('auth.login.errorInvalid'))
      } else if (err instanceof LoginError && err.kind === 'network') {
        setError(t('auth.login.errorNetwork'))
      } else {
        setError(t('auth.login.errorGeneric'))
      }
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col')}>
      <Card className='overflow-hidden p-0'>
        <CardContent className='grid p-8 md:p-8'>
          <form className='p-6 md:p-8' onSubmit={handleSubmit}>
            <div className='flex flex-col gap-6'>
              <div className='flex flex-col items-center text-center'>
                <h1 className='text-2xl font-bold'>{t('auth.login.welcomeBack')}</h1>
                <p className='text-muted-foreground text-balance'>{t('auth.login.subtitle')}</p>
              </div>
              <div className='grid gap-3'>
                <Label htmlFor='email'>{t('auth.login.email')}</Label>
                <Input
                  id='email'
                  type='email'
                  placeholder='john.doe@example.com'
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className='grid gap-3'>
                <Label htmlFor='password'>{t('auth.login.password')}</Label>
                <Input
                  id='password'
                  type='password'
                  required
                  value={password}
                  placeholder='********'
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <div className='text-red-500 text-sm'>{error}</div>}
              <Button type='submit' className='w-full' disabled={isLoading}>
                {isLoading ? (
                  <>
                    <svg
                      className='mr-2 h-4 w-4 animate-spin'
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'
                    >
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      />
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      />
                    </svg>
                    {t('auth.login.submitting')}
                  </>
                ) : (
                  t('auth.login.submit')
                )}
              </Button>
              <div className='text-center text-sm'>
                {t('auth.login.noAccount')}{' '}
                <Link to='/register' className='underline underline-offset-4'>
                  {t('auth.login.signUp')}
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className='text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4 mt-4'>
        {t('auth.login.termsPrefix')} <a href='#'>{t('auth.login.termsLink')}</a>{' '}
        {t('auth.login.termsJoiner')} <a href='#'>{t('auth.login.privacyLink')}</a>.
      </div>
    </div>
  )
}
