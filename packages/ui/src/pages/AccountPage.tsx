import { useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import type { GameConfig } from '../app/gameConfig.js'
import { loadPreferredAssistance, storePreferredAssistance } from '../app/gameConfigStorage.js'
import { useAuth, type AuthContextValue } from '../auth/AuthContext.js'
import type { AuthUser } from '../auth/authTypes.js'
import { profileService } from '../auth/supabaseProfileService.js'
import { AuthPageShell, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from '../components/AuthPageShell.js'

export function AccountPage() {
  const auth = useAuth()
  const [params] = useSearchParams()
  const [password, setPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  if (!auth.loading && !auth.user) return <Navigate to="/login" replace />
  if (!auth.user) return <div className="grid min-h-svh place-items-center bg-[#fbfaf5] text-stone-600">Loading account…</div>

  const updatePassword = async (event: FormEvent) => {
    event.preventDefault()
    setPasswordError(null)
    try {
      await auth.updatePassword(password)
      setPassword('')
      setPasswordMessage('Password updated.')
    } catch {
      setPasswordError('Unable to update the password. Please request a new reset link.')
    }
  }
  const showPassword = auth.passwordRecovery || params.get('reset') === '1'

  return <AuthPageShell title="Your account" intro="Manage your profile and preferred way to play.">
    <AccountDetailsForm auth={auth} user={auth.user} />
    {showPassword && <form className="mt-7 space-y-4 border-t border-stone-200 pt-6" onSubmit={(event) => void updatePassword(event)}><h2 className="font-serif text-xl font-semibold text-emerald-950">Choose a new password</h2><label className="block text-sm font-semibold">New password<input className={INPUT_CLASS} type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{passwordError && <p role="alert" className="text-sm text-red-800">{passwordError}</p>}{passwordMessage && <p role="status" className="text-sm text-emerald-800">{passwordMessage}</p>}<button className={PRIMARY_BUTTON_CLASS} type="submit">Update password</button></form>}
  </AuthPageShell>
}

function AccountDetailsForm({ auth, user }: { auth: AuthContextValue; user: AuthUser }) {
  const [displayName, setDisplayName] = useState(user.displayName ?? '')
  const [email, setEmail] = useState(user.email)
  const [assistance, setAssistance] = useState<GameConfig['assistance']>(loadPreferredAssistance)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const saveAccount = async (event: FormEvent) => {
    event.preventDefault()
    const nextDisplayName = displayName.trim()
    const nextEmail = email.trim()
    const emailChanged = nextEmail !== user.email
    const displayNameChanged = nextDisplayName !== (user.displayName ?? '')
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      let updatedUser = user
      if (emailChanged || displayNameChanged) {
        updatedUser = await auth.updateAccount({
          ...(emailChanged ? { email: nextEmail } : {}),
          ...(displayNameChanged ? { displayName: nextDisplayName } : {}),
        })
      }
      await profileService.saveAccountProfile(user.id, { displayName: nextDisplayName || null, preferredAssistance: assistance })
      storePreferredAssistance(assistance)
      setMessage(emailChanged && updatedUser.email !== nextEmail
        ? `Changes saved. Check ${nextEmail} to confirm the new email address.`
        : 'Account details updated.')
    } catch {
      setError('Unable to update the account details. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return <form className="mt-7 space-y-5" onSubmit={(event) => void saveAccount(event)}>
    <label className="block text-sm font-semibold text-stone-700">Display name
      <input className={INPUT_CLASS} autoComplete="nickname" maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
    </label>
    <label className="block text-sm font-semibold text-stone-700">Email
      <input className={INPUT_CLASS} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
    </label>
    <label className="block text-sm font-semibold text-stone-700">Preferred play
      <select className={INPUT_CLASS} value={assistance} onChange={(event) => setAssistance(event.target.value as GameConfig['assistance'])}>
        <option value="learning">Learning Mode</option>
        <option value="none">Play Without Help</option>
      </select>
    </label>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}
    <button className={PRIMARY_BUTTON_CLASS} disabled={saving} type="submit">{saving ? 'Saving…' : 'Save changes'}</button>
  </form>
}
