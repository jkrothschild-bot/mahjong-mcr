import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { InfoPage } from '../pages/InfoPage.js'
import { LandingPage } from '../pages/LandingPage.js'
import { PlayPage } from '../pages/PlayPage.js'
import { LoginPage } from '../pages/LoginPage.js'
import { RegisterPage } from '../pages/RegisterPage.js'
import { ResetPasswordPage } from '../pages/ResetPasswordPage.js'
import { AccountPage } from '../pages/AccountPage.js'
import { AuthProvider } from '../auth/AuthContext.js'
import { GuestSaveMigration } from '../components/GuestSaveMigration.js'
import { AnalyticsProvider } from '../analytics/AnalyticsContext.js'
import { soundEffectsPlayer, type SoundEffectsPlayer } from '../audio/soundEffects.js'
import { storedSoundEffectsEnabled } from '../settings/useSettings.js'

const GamePage = lazy(async () => ({ default: (await import('../pages/GamePage.js')).GamePage }))

export function RootApp() {
  return <SoundUnlockBoundary><BrowserRouter basename={import.meta.env.BASE_URL}><AuthProvider><AnalyticsProvider><GuestSaveMigration /><AppRoutes /></AnalyticsProvider></AuthProvider></BrowserRouter></SoundUnlockBoundary>
}

export function SoundUnlockBoundary({ children, player = soundEffectsPlayer }: { children: ReactNode; player?: SoundEffectsPlayer }) {
  const unlock = () => {
    if (storedSoundEffectsEnabled()) player.unlock()
  }
  // `contents` keeps this event boundary out of every page's layout while
  // allowing the landing-page Start tap—not merely a later in-game tap—to
  // satisfy iPad Safari's user-activation requirement.
  return <div className="contents" onPointerDownCapture={unlock} onKeyDownCapture={unlock}>{children}</div>
}

export function AppRoutes() {
  return <Routes>
    <Route path="/" element={<LandingPage />} /><Route path="/play" element={<PlayPage />} /><Route path="/game" element={<Suspense fallback={<div className="grid min-h-svh place-items-center bg-neutral-900 text-neutral-200">Loading game…</div>}><GamePage /></Suspense>} />
    <Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /><Route path="/reset" element={<ResetPasswordPage />} /><Route path="/account" element={<AccountPage />} />
    <Route path="/privacy" element={<InfoPage title="Privacy">Privacy details will be published before public launch. The application will describe account, gameplay and minimal analytics data clearly.</InfoPage>} />
    <Route path="/terms" element={<InfoPage title="Terms of use">Terms of use will be published before public launch.</InfoPage>} />
    <Route path="/feedback" element={<InfoPage title="Feedback">A public feedback contact will be added when the deployment domain is confirmed.</InfoPage>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}
