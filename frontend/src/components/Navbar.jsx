import { Link, useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../store/auth'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-cyber-border"
      style={{ background: 'rgba(10, 10, 15, 0.95)', backdropFilter: 'blur(10px)' }}>
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">₿</span>
          <span className="font-orbitron font-bold text-lg text-cyber-cyan text-glow-cyan">
            CRYPTO<span className="text-cyber-pink">PLAYGROUND</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-6">
          {user && (
            <>
              <Link
                to="/dashboard"
                className={`font-mono text-sm uppercase tracking-wider transition-colors ${
                  isActive('/dashboard') ? 'text-cyber-cyan text-glow-cyan' : 'text-gray-400 hover:text-cyber-cyan'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/crypto"
                className={`font-mono text-sm uppercase tracking-wider transition-colors ${
                  isActive('/crypto') ? 'text-cyber-cyan text-glow-cyan' : 'text-gray-400 hover:text-cyber-cyan'
                }`}
              >
                Markets
              </Link>
            </>
          )}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="font-mono text-sm text-cyber-cyan opacity-70">
                {user.username}
              </span>
              <button
                onClick={handleLogout}
                className="btn-cyber-outline text-sm px-4 py-2"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="btn-cyber-outline text-sm px-4 py-2">
                Login
              </Link>
              <Link to="/register" className="btn-cyber-cyan text-sm px-4 py-2">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
