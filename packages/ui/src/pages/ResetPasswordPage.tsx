import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.js'
import { AuthPageShell, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from '../components/AuthPageShell.js'

export function ResetPasswordPage() {
  const auth = useAuth(); const [email, setEmail] = useState(''); const [error, setError] = useState<string | null>(null); const [sent, setSent] = useState(false); const [submitting, setSubmitting] = useState(false)
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(null); setSubmitting(true); try { await auth.resetPassword(email); setSent(true) } catch { setError(auth.configured ? 'Unable to send a reset link. Please try again.' : auth.configurationMessage ?? 'Accounts are unavailable.') } finally { setSubmitting(false) } }
  return <AuthPageShell title="Reset your password" intro="Enter your email and we’ll send a secure reset link.">{sent ? <div className="mt-7"><p role="status" className="rounded-lg bg-emerald-50 p-4 text-emerald-900">If an account matches that address, a reset link has been sent.</p><Link className="mt-5 inline-block text-emerald-800 underline" to="/login">Back to login</Link></div> : <form className="mt-7 space-y-5" onSubmit={(event) => void submit(event)}><label className="block text-sm font-semibold">Email<input className={INPUT_CLASS} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}<button className={PRIMARY_BUTTON_CLASS} disabled={submitting} type="submit">{submitting ? 'Sending…' : 'Send reset link'}</button></form>}</AuthPageShell>
}
