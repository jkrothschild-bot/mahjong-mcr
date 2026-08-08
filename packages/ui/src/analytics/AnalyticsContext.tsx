/* oxlint-disable react/only-export-components -- Provider and its hook intentionally share one context module. */
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext.js'
import type { AnalyticsService } from './AnalyticsService.js'
import { SupabaseAnalyticsService } from './supabaseAnalytics.js'

const fallback = new SupabaseAnalyticsService()
const AnalyticsContext = createContext<AnalyticsService>(fallback)

export function AnalyticsProvider({ children, service }: { children: ReactNode; service?: AnalyticsService }) {
  const analytics = useMemo(() => service ?? new SupabaseAnalyticsService(), [service])
  const auth = useAuth()
  useEffect(() => { void analytics.identify?.(auth.user?.id ?? null) }, [analytics, auth.user])
  return <AnalyticsContext.Provider value={analytics}>{children}</AnalyticsContext.Provider>
}

export function useAnalytics(): AnalyticsService { return useContext(AnalyticsContext) }
