import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form,  setForm]  = useState({ email:'', password:'' })
  const [error, setError] = useState('')
  const [busy,  setBusy]  = useState(false)

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true)
    try { await login(form.email, form.password); navigate('/dashboard') }
    catch (err) { setError(err.response?.data?.detail || 'Login failed. Check your credentials.') }
    finally { setBusy(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo">⚡ TeamFlow</div>
        <div className="auth-sub">Team Collaboration & Workflow Management Platform</div>
        <div className="auth-card">
          <h2 className="auth-title">Sign in to your account</h2>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={onSubmit}>
            <div className="fg">
              <label>Email Address</label>
              <input className="fi" type="email" name="email" value={form.email} onChange={onChange} required placeholder="you@company.com" autoComplete="email" />
            </div>
            <div className="fg">
              <label>Password</label>
              <input className="fi" type="password" name="password" value={form.password} onChange={onChange} required placeholder="••••••••" autoComplete="current-password" />
            </div>
            <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:11 }} disabled={busy}>
              {busy ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
          <div className="auth-foot">No account? <Link to="/register">Register here</Link></div>
        </div>
      </div>
    </div>
  )
}
