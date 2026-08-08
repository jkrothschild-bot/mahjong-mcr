import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.js'
import { AuthPageShell, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from '../components/AuthPageShell.js'
import { useAnalytics } from '../analytics/AnalyticsContext.js'
import { trackSafely } from '../analytics/AnalyticsService.js'

export function RegisterPage() {
  const auth = useAuth(); const navigate = useNavigate(); const [displayName, setDisplayName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false)
  const analytics = useAnalytics()
  if (auth.user) return <Navigate to="/account" replace />
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(null); setMessage(null); setSubmitting(true); trackSafely(analytics, 'registration_started')
    try {
      const result = await auth.signUp(email, password, displayName.trim() || undefined)
      trackSafely(analytics, 'registration_completed')
      if (result.requiresEmailVerification) setMessage('Check your email to verify your account, then log in. Your game remains saved on this device until migration succeeds.')
      else navigate('/account')
    } catch { setError(auth.configured ? 'Unable to create the account. Check your details and try again.' : auth.configurationMessage ?? 'Accounts are unavailable.') }
    finally { setSubmitting(false) }
  }
  return <AuthPageShell title="Create your account" intro="Save your progress, continue on another device and keep your playing history."><form className="mt-7 space-y-5" onSubmit={(event) => void submit(event)}><label className="block text-sm font-semibold">Display name <span className="font-normal text-stone-500">(optional)</span><input className={INPUT_CLASS} autoComplete="nickname" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label><label className="block text-sm font-semibold">Email<input className={INPUT_CLASS} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="block text-sm font-semibold">Password<input className={INPUT_CLASS} type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}{message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}<button className={PRIMARY_BUTTON_CLASS} disabled={submitting} type="submit">{submitting ? 'Creating account…' : 'Create account'}</button></form><p className="mt-5 text-sm text-stone-600">Already registered? <Link className="text-emerald-800 underline" to="/login">Log in</Link></p></AuthPageShell>
}
