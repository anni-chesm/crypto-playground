import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'

export default function BotDetail() {
  const { id } = useParams()
  const [bot, setBot] = useState(null)
  const [orders, setOrders] = useState([])
  const [positions, setPositions] = useState([])
  const [tab, setTab] = useState('positions')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadBot()
  }, [id])

  const loadBot = async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Get bot data first (uses JWT)
      const botRes = await api.get(`/bots/${id}`)
      const botData = botRes.data
      setBot(botData)

      // 2. Get trading data using the bot's API token (not JWT)
      const apiToken = botData.api_token
      const [oRes, pRes] = await Promise.all([
        fetch('/api/trading/orders', { headers: { 'X-API-Token': apiToken } }),
        fetch('/api/trading/positions', { headers: { 'X-API-Token': apiToken } })
      ])
      const ordersData = await oRes.json()
      const posData = await pRes.json()
      setOrders(Array.isArray(ordersData) ? ordersData : [])
      setPositions(Array.isArray(posData) ? posData : [])
    } catch (err) {
      console.error(err)
      setError('Failed to load bot details')
    } finally {
      setLoading(false)
    }
  }

  const copyToken = () => {
    navigator.clipboard.writeText(bot.api_token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const cancelOrder = async (orderId) => {
    try {
      await fetch(`/api/trading/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'X-API-Token': bot.api_token }
      })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o))
    } catch (err) {
      console.error('Cancel order error:', err)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="font-mono text-cyber-cyan loading-glow">Loading bot...</span>
    </div>
  )

  if (error || !bot) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="font-mono text-cyber-pink">{error || 'Bot not found'}</p>
      <Link to="/dashboard" className="btn-cyber-outline">← Dashboard</Link>
    </div>
  )

  const pnl = bot.current_balance - bot.initial_balance
  const pnlPct = ((pnl / bot.initial_balance) * 100).toFixed(2)
  const isPositive = pnl >= 0

  return (
    <div className="min-h-screen grid-bg pt-20 px-4 pb-8">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <Link to="/dashboard" className="font-mono text-xs text-gray-500 hover:text-cyber-cyan mb-6 block">
          ← Back to Dashboard
        </Link>

        {/* Bot header */}
        <div className="cyber-card p-6 mb-6 glow-cyan">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-orbitron font-black text-2xl text-white mb-1">{bot.name}</h1>
              <p className="font-mono text-xs text-gray-500">
                Created {new Date(bot.created_at).toLocaleString()}
              </p>
            </div>
            <div className={`text-right ${isPositive ? 'badge-positive' : 'badge-negative'}`}>
              <p className="font-orbitron font-bold text-2xl">
                {isPositive ? '+' : ''}${pnl.toFixed(2)}
              </p>
              <p className="font-mono text-xs">
                {isPositive ? '+' : ''}{pnlPct}% P&L
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-black bg-opacity-40 p-3 border border-cyber-border">
              <p className="font-mono text-xs text-gray-500">BALANCE</p>
              <p className="font-mono text-cyber-cyan font-bold">${parseFloat(bot.current_balance).toFixed(2)}</p>
            </div>
            <div className="bg-black bg-opacity-40 p-3 border border-cyber-border">
              <p className="font-mono text-xs text-gray-500">INITIAL</p>
              <p className="font-mono text-white font-bold">${parseFloat(bot.initial_balance).toFixed(2)}</p>
            </div>
            <div className="bg-black bg-opacity-40 p-3 border border-cyber-border">
              <p className="font-mono text-xs text-gray-500">POSITIONS</p>
              <p className="font-mono text-white font-bold">{positions.length}</p>
            </div>
            <div className="bg-black bg-opacity-40 p-3 border border-cyber-border">
              <p className="font-mono text-xs text-gray-500">TOTAL ORDERS</p>
              <p className="font-mono text-white font-bold">{orders.length}</p>
            </div>
          </div>

          {/* API Token */}
          <div className="mt-5">
            <p className="font-mono text-xs text-gray-500 mb-2 uppercase tracking-wider">API Token</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-black bg-opacity-60 border border-cyber-border p-3 font-mono text-xs text-cyber-cyan overflow-hidden">
                <span className="blur-sm hover:blur-none transition-all select-all">
                  {bot.api_token}
                </span>
              </div>
              <button
                onClick={copyToken}
                className={`btn-cyber-outline text-xs px-4 py-3 whitespace-nowrap ${copied ? 'text-cyber-green border-cyber-green' : ''}`}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <p className="font-mono text-xs text-gray-600 mt-1">
              Use header: <code className="text-cyber-pink">X-API-Token: {'<'}token{'>'}</code>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-cyber-border mb-6">
          <div className="flex">
            {['positions', 'orders'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`cyber-tab ${tab === t ? 'active' : ''}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === 'orders' && ` (${orders.length})`}
                {t === 'positions' && ` (${positions.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Positions tab */}
        {tab === 'positions' && (
          <div>
            {positions.length === 0 ? (
              <div className="cyber-card p-8 text-center">
                <p className="font-mono text-gray-500">No open positions</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-cyber-border">
                      {['Symbol', 'Qty', 'Avg Entry', 'Leverage', 'Margin', 'Notional', 'Since'].map(h => (
                        <th key={h} className="font-mono text-xs text-gray-500 text-left p-3 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map(pos => {
                      const lev = pos.leverage || 1
                      const margin = pos.margin || (pos.avg_entry_price * pos.quantity / lev)
                      const notional = pos.avg_entry_price * pos.quantity
                      return (
                        <tr key={pos.id} className="border-b border-cyber-border hover:bg-white hover:bg-opacity-5">
                          <td className="p-3 font-mono font-bold text-cyber-cyan">{pos.symbol}</td>
                          <td className="p-3 font-mono text-white">{parseFloat(pos.quantity).toFixed(6)}</td>
                          <td className="p-3 font-mono text-gray-300">${parseFloat(pos.avg_entry_price).toFixed(4)}</td>
                          <td className="p-3 font-mono">
                            <span className={`px-2 py-0.5 text-xs font-bold border ${
                              lev >= 20 ? 'text-cyber-pink border-cyber-pink' :
                              lev >= 5  ? 'text-cyber-yellow border-cyber-yellow' :
                                          'text-cyber-green border-cyber-green'
                            }`}>x{lev}</span>
                          </td>
                          <td className="p-3 font-mono text-gray-300">${margin.toFixed(2)}</td>
                          <td className="p-3 font-mono text-gray-400">${notional.toFixed(2)}</td>
                          <td className="p-3 font-mono text-xs text-gray-500">
                            {new Date(pos.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Orders tab */}
        {tab === 'orders' && (
          <div>
            {orders.length === 0 ? (
              <div className="cyber-card p-8 text-center">
                <p className="font-mono text-gray-500">No orders yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-cyber-border">
                      {['ID', 'Type', 'Symbol', 'Qty', 'Price', 'Lev', 'Margin', 'Status', 'Date', 'Action'].map(h => (
                        <th key={h} className="font-mono text-xs text-gray-500 text-left p-3 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id} className="border-b border-cyber-border hover:bg-white hover:bg-opacity-5">
                        <td className="p-3 font-mono text-xs text-gray-500">#{order.id}</td>
                        <td className="p-3 font-mono text-sm">
                          <span className={`px-2 py-1 text-xs uppercase ${
                            order.type === 'buy' ? 'text-cyber-green border border-cyber-green' :
                            order.type === 'sell' ? 'text-cyber-pink border border-cyber-pink' :
                            'text-gray-400 border border-gray-600'
                          }`}>
                            {order.type}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-cyber-cyan">{order.symbol}</td>
                        <td className="p-3 font-mono text-white">{parseFloat(order.quantity).toFixed(6)}</td>
                        <td className="p-3 font-mono text-gray-300">${parseFloat(order.price).toFixed(4)}</td>
                        <td className="p-3 font-mono">
                          <span className={`text-xs px-1.5 py-0.5 border ${
                            (order.leverage||1) >= 20 ? 'text-cyber-pink border-cyber-pink' :
                            (order.leverage||1) >= 5  ? 'text-cyber-yellow border-cyber-yellow' :
                                                        'text-gray-500 border-gray-700'
                          }`}>x{order.leverage||1}</span>
                        </td>
                        <td className="p-3 font-mono text-gray-400 text-xs">
                          {order.margin ? `$${parseFloat(order.margin).toFixed(2)}` : '—'}
                        </td>
                        <td className="p-3 font-mono text-xs">
                          <span className={
                            order.status === 'filled'     ? 'text-cyber-green' :
                            order.status === 'liquidated' ? 'text-cyber-pink font-bold' :
                            order.status === 'cancelled'  ? 'text-gray-500' :
                            'text-cyber-yellow'
                          }>
                            {order.status === 'liquidated' ? '⚡ LIQ' : order.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          {order.status === 'open' && (
                            <button
                              onClick={() => cancelOrder(order.id)}
                              className="font-mono text-xs text-cyber-pink hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* API Usage */}
        <div className="cyber-card p-6 mt-6">
          <h3 className="font-orbitron text-cyber-cyan text-sm mb-4 uppercase">API Usage Examples</h3>
          <div className="space-y-3 font-mono text-xs">
            <div className="bg-black bg-opacity-60 p-3 border border-cyber-border">
              <p className="text-gray-500 mb-1"># Buy 0.001 BTC</p>
              <p className="text-cyber-green">curl -X POST https://192.168.1.19:8001/api/trading/buy \</p>
              <p className="text-cyber-green pl-4">-H "X-API-Token: {bot.api_token.slice(0, 8)}..." \</p>
              <p className="text-cyber-green pl-4">-H "Content-Type: application/json" \</p>
              <p className="text-cyber-green pl-4">-d '{`{"symbol":"BTCUSDT","quantity":0.001,"leverage":10}`}'</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
