import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Register() {
  const { register } = useAuth()
  const navigate     = useNavigate()
  const [form,  setForm]  = useState({ username:'', email:'', password:'' })
  const [error, setError] = useState('')
  const [busy,  setBusy]  = useState(false)

  const onChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true)
    try { await register(form.username, form.email, form.password); navigate('/login') }
    catch (err) { setError(err.response?.data?.detail || 'Registration failed.') }
    finally { setBusy(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo">⚡ TeamFlow</div>
        <div className="auth-sub">Create an account to start collaborating</div>
        <div className="auth-card">
          <h2 className="auth-title">Create your account</h2>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={onSubmit}>
            <div className="fg">
              <label>Username</label>
              <input className="fi" name="username" value={form.username} onChange={onChange} required placeholder="johndoe" minLength={3} />
            </div>
            <div className="fg">
              <label>Email Address</label>
              <input className="fi" type="email" name="email" value={form.email} onChange={onChange} required placeholder="you@company.com" />
            </div>
            <div className="fg">
              <label>Password</label>
              <input className="fi" type="password" name="password" value={form.password} onChange={onChange} required placeholder="Minimum 6 characters" minLength={6} />
            </div>
            <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:11 }} disabled={busy}>
              {busy ? 'Creating account…' : 'Create Account →'}
            </button>
          </form>
          <div className="auth-foot">Already have an account? <Link to="/login">Sign in</Link></div>
        </div>
      </div>
    </div>
  )
}
