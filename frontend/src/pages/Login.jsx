import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import useAuthStore from '../store/auth'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data } = await api.post('/auth/login', form)
      login(data.token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-4 pt-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-orbitron font-black text-3xl text-cyber-cyan text-glow-cyan mb-2">
            ACCESS
          </h1>
          <p className="font-mono text-sm text-gray-500">Enter your credentials to continue</p>
        </div>

        {/* Card */}
        <div className="cyber-card p-8 glow-cyan">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="border border-cyber-pink p-3 font-mono text-sm text-cyber-pink">
                ⚠ {error}
              </div>
            )}

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
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full btn-cyber-cyan text-base py-3 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Authenticating...' : 'Login'}
            </button>
          </form>

          <p className="text-center font-mono text-sm text-gray-500 mt-6">
            No account?{' '}
            <Link to="/register" className="text-cyber-cyan hover:text-glow-cyan">
              Register here
            </Link>
          </p>
        </div>

        {/* Demo note */}
        <p className="text-center font-mono text-xs text-gray-600 mt-4">
          Demo: demo@crypto.play / demo123
        </p>
      </div>
    </div>
  )
}
