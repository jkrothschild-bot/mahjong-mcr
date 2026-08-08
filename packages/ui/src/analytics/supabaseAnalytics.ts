import type { AnalyticsService } from './AnalyticsService.js'
import type { AnalyticsEventName, AnalyticsProperties } from './analyticsEvents.js'
import { getAnalyticsSessionId, getVisitorId } from './analyticsIdentity.js'
import { getSupabaseClient } from '../auth/supabaseClient.js'

export class SupabaseAnalyticsService implements AnalyticsService {
  private userId: string | null = null
  identify(userId: string | null): void { this.userId = userId }
  async track(event: AnalyticsEventName, properties: AnalyticsProperties = {}): Promise<void> {
    const client = getSupabaseClient()
    if (!client) return
    const { error } = await client.from('analytics_events').insert({ visitor_id: getVisitorId(), user_id: this.userId, event_name: event, session_id: getAnalyticsSessionId(), properties })
    if (error) throw error
  }
}
