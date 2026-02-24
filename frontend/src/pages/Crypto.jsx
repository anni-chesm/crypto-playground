import { useState, useEffect } from 'react'
import api from '../api/client'
import CandleChart from '../components/CandleChart'

export default function Crypto() {
  const [coins, setCoins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSymbol, setSelectedSymbol] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadCoins()
  }, [])

  const loadCoins = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/crypto/list')
      setCoins(data)
      if (data.length > 0 && !selectedSymbol) {
        setSelectedSymbol(data[0].symbol.toUpperCase())
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load crypto list')
    } finally {
      setLoading(false)
    }
  }

  const filteredCoins = coins
    .filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aSym = a.symbol.toUpperCase()
      const bSym = b.symbol.toUpperCase()
      if (aSym === 'BTC') return -1
      if (bSym === 'BTC') return 1
      return b.current_price - a.current_price
    })

  const formatPrice = (p) => {
    if (p >= 1000) return `$${p.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
    if (p >= 1) return `$${p.toFixed(4)}`
    return `$${p.toFixed(6)}`
  }

  const formatMCap = (v) => {
    if (!v) return 'N/A'
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
    return `$${v.toLocaleString()}`
  }

  return (
    <div className="min-h-screen grid-bg pt-20 px-4 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-orbitron font-black text-2xl text-cyber-cyan text-glow-cyan">
            MARKETS
          </h1>
          <button
            onClick={loadCoins}
            className="btn-cyber-outline text-xs px-4 py-2"
          >
            ↺ Refresh
          </button>
        </div>

        {/* Chart */}
        {selectedSymbol && (
          <div className="mb-6">
            <CandleChart symbol={selectedSymbol} />
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            className="cyber-input max-w-sm"
            placeholder="Search coins..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 border border-cyber-pink p-3 font-mono text-sm text-cyber-pink">
            ⚠ {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <span className="font-mono text-cyber-cyan loading-glow">Fetching market data...</span>
          </div>
        ) : (
          /* Coins grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredCoins.map(coin => {
              const change = coin.price_change_percentage_24h || 0
              const isUp = change >= 0
              const isSelected = selectedSymbol === coin.symbol.toUpperCase()

              return (
                <div
                  key={coin.id}
                  onClick={() => setSelectedSymbol(coin.symbol.toUpperCase())}
                  className={`cyber-card p-4 cursor-pointer transition-all ${
                    isSelected ? 'glow-cyan border-cyber-cyan' : ''
                  }`}
                >
                  {/* Rank + Icon */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={coin.image}
                        alt={coin.symbol}
                        className="w-6 h-6 rounded-full"
                        onError={e => e.target.style.display = 'none'}
                      />
                      <span className="font-mono text-xs text-gray-500">#{coin.market_cap_rank}</span>
                    </div>
                    <span className={`font-mono text-xs font-bold ${isUp ? 'badge-positive' : 'badge-negative'}`}>
                      {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                    </span>
                  </div>

                  {/* Name */}
                  <p className="font-orbitron font-bold text-white text-sm truncate mb-0.5">{coin.symbol.toUpperCase()}</p>
                  <p className="font-mono text-xs text-gray-500 truncate mb-2">{coin.name}</p>

                  {/* Price */}
                  <p className="font-mono font-bold text-cyber-cyan">{formatPrice(coin.current_price)}</p>

                  {/* Market cap */}
                  <p className="font-mono text-xs text-gray-500 mt-1">{formatMCap(coin.market_cap)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
