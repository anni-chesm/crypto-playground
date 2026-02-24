import { Link } from 'react-router-dom'
import useAuthStore from '../store/auth'

const features = [
  {
    icon: '🤖',
    title: 'Trading Bots',
    desc: 'Create autonomous bots with unique API tokens. Program your strategies, let them trade 24/7.'
  },
  {
    icon: '📊',
    title: 'Live Charts',
    desc: 'Real-time candlestick charts powered by TradingView lightweight-charts. Multiple timeframes.'
  },
  {
    icon: '🛡️',
    title: 'Risk Management',
    desc: 'Stop-loss and take-profit orders built in. Simulate real trading without financial risk.'
  }
]

export default function Welcome() {
  const { isAuthenticated } = useAuthStore()

  return (
    <div className="min-h-screen grid-bg pt-16">
      <div className="scan-line" />

      {/* Hero */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        {/* Logo */}
        <div className="mb-4">
          <span className="text-6xl">₿</span>
        </div>

        {/* Title with glitch */}
        <h1 className="font-orbitron font-black text-5xl md:text-7xl mb-4 glitch-text text-cyber-cyan">
          CRYPTO
          <br />
          <span className="text-cyber-pink">PLAYGROUND</span>
        </h1>

        <p className="font-mono text-xl text-gray-400 mb-2 max-w-2xl">
          Simulated crypto trading platform.
        </p>
        <p className="font-mono text-sm text-gray-600 mb-10 max-w-xl">
          Build trading bots, test strategies, analyze markets — all with virtual money.
          No risk. Pure learning.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="btn-cyber-cyan text-base px-8 py-3">
                Launch Dashboard
              </Link>
              <Link to="/crypto" className="btn-cyber-outline text-base px-8 py-3">
                View Markets
              </Link>
            </>
          ) : (
            <>
              <Link to="/register" className="btn-cyber-cyan text-base px-8 py-3">
                Start Trading
              </Link>
              <Link to="/login" className="btn-cyber-outline text-base px-8 py-3">
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full px-4">
          {features.map((f, i) => (
            <div key={i} className="cyber-card p-6 text-left group cursor-default">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="font-orbitron font-bold text-cyber-cyan text-lg mb-3 group-hover:text-glow-cyan transition-all">
                {f.title}
              </h3>
              <p className="font-mono text-sm text-gray-400 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Stats ticker */}
        <div className="mt-16 border border-cyber-border w-full max-w-3xl px-6 py-3 flex justify-around font-mono text-xs text-gray-500">
          <span>$0 RISK</span>
          <span className="text-cyber-cyan">|</span>
          <span>$1000 STARTING BALANCE</span>
          <span className="text-cyber-cyan">|</span>
          <span>50 COINS TRACKED</span>
          <span className="text-cyber-cyan">|</span>
          <span>REAL-TIME DATA</span>
        </div>
      </div>
    </div>
  )
}
