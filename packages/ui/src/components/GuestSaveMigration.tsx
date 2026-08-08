import { useEffect, useRef } from 'react'
import { useAuth } from '../auth/AuthContext.js'
import { migrateGuestGameToUser } from '../persistence/persistenceCoordinator.js'

export const SAVE_MIGRATED_EVENT = 'mcr-mahjong:save-migrated'

export function GuestSaveMigration() {
  const auth = useAuth()
  const attempted = useRef<string | null>(null)
  useEffect(() => {
    if (!auth.user || attempted.current === auth.user.id) return
    attempted.current = auth.user.id
    void migrateGuestGameToUser(auth.user.id)
      .then((migrated) => { if (migrated) window.dispatchEvent(new Event(SAVE_MIGRATED_EVENT)) })
      .catch(() => { attempted.current = null })
  }, [auth.user])
  return null
}
