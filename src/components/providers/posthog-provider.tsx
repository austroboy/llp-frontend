'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { Suspense, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: '2025-05-24',
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
  })
}

function PostHogIdentify() {
  const ph = usePostHog()
  const { isSignedIn, user, isLoaded } = useUser()

  useEffect(() => {
    if (!ph || !isLoaded) return
    if (isSignedIn && user) {
      ph.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
      })
    } else {
      ph.reset()
    }
  }, [ph, isSignedIn, isLoaded, user?.id, user?.fullName, user?.primaryEmailAddress?.emailAddress])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogIdentify />
      </Suspense>
      {children}
    </PHProvider>
  )
}
