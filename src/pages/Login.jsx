import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMsg({ type: '', text: '' })
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMsg({ type: 'error', text: error.message })
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) setMsg({ type: 'error', text: error.message })
      else if (!data.session)
        setMsg({ type: 'ok', text: 'Account created. Check your email to confirm, then log in.' })
    }
    setBusy(false)
  }

  return (
    <div className="center-screen">
      <form className="card login" onSubmit={submit}>
        <div className="brand dark">
          <span className="egg" />
          My Layer
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {msg.text && <p className={`msg ${msg.type}`}>{msg.text}</p>}
        <button className="btn" disabled={busy}>
          {mode === 'signin' ? 'Log in' : 'Create account'}
        </button>
        <button
          type="button"
          className="link"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setMsg({ type: '', text: '' })
          }}
        >
          {mode === 'signin' ? 'No account? Create one' : 'Have an account? Log in'}
        </button>
      </form>
    </div>
  )
}
