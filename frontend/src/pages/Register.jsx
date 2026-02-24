import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import useAuthStore from '../store/auth'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data } = await api.post('/auth/register', form)
      login(data.token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-4 pt-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-orbitron font-black text-3xl text-cyber-pink text-glow-pink mb-2">
            INITIALIZE
          </h1>
          <p className="font-mono text-sm text-gray-500">Create your trader profile</p>
        </div>

        {/* Card */}
        <div className="cyber-card p-8 glow-pink">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="border border-cyber-pink p-3 font-mono text-sm text-cyber-pink">
                ⚠ {error}
              </div>
            )}

            <div>
              <label className="block font-mono text-xs text-cyber-cyan mb-2 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                className="cyber-input"
                placeholder="hacker_trader"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                required
                minLength={3}
              />
            </div>

            <div>
              <label className="block font-mono text-xs text-cyber-cyan mb-2 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                className="cyber-input"
                placeholder="user@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block font-mono text-xs text-cyber-cyan mb-2 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                className="cyber-input"
                placeholder="min 6 characters"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                minLength={6}
              />
            </div>

            <div className="border border-cyber-border p-3 font-mono text-xs text-gray-500">
              🎁 Starting bonus: <span className="text-cyber-green">$1,000 virtual balance</span> for each bot you create
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full btn-cyber-pink text-base py-3 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center font-mono text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-cyber-cyan hover:text-glow-cyan">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
