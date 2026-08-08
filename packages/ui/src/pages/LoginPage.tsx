import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthPageShell, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from '../components/AuthPageShell.js'
import { useAuth } from '../auth/AuthContext.js'

export function LoginPage() {
  const auth = useAuth(); const navigate = useNavigate(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false)
  if (auth.user) return <Navigate to="/" replace />
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(null); setSubmitting(true); try { await auth.signIn(email, password); navigate('/') } catch { setError(auth.configured ? 'Unable to log in. Check your details and try again.' : auth.configurationMessage ?? 'Accounts are unavailable.') } finally { setSubmitting(false) } }
  return <AuthPageShell title="Log in" intro="Resume your saved game and continue on any supported device."><form className="mt-7 space-y-5" onSubmit={(event) => void submit(event)}><label className="block text-sm font-semibold">Email<input className={INPUT_CLASS} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="block text-sm font-semibold">Password<input className={INPUT_CLASS} type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}<button className={PRIMARY_BUTTON_CLASS} disabled={submitting} type="submit">{submitting ? 'Logging in…' : 'Log in'}</button></form><div className="mt-5 flex justify-between text-sm"><Link className="text-emerald-800 underline" to="/reset">Forgot password?</Link><Link className="text-emerald-800 underline" to="/register">Create account</Link></div></AuthPageShell>
}
