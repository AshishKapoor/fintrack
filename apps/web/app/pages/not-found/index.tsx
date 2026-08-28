import React from 'react'
import { Link } from 'react-router-dom'

const NotFoundPage: React.FC = () => {
  return (
    <div className='flex min-h-full flex-col items-center justify-center bg-background'>
      <h1 className='mb-4 text-6xl font-bold text-foreground'>404</h1>
      <h2 className='mb-6 text-2xl font-semibold text-foreground'>Page Not Found</h2>
      <p className='mb-8 text-muted-foreground'>
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link
        to='/'
        className='rounded-md bg-primary px-6 py-3 text-primary-foreground transition-colors'
      >
        Return to Home
      </Link>
    </div>
  )
}

export default NotFoundPage
