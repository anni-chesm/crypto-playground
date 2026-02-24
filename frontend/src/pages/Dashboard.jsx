import { useState, useEffect } from 'react'
import api from '../api/client'
import useAuthStore from '../store/auth'
import BotCard from '../components/BotCard'

export default function Dashboard() {
  const { user } = useAuthStore()
  const [bots, setBots] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newBotName, setNewBotName] = useState('')
  const [newBotBalance, setNewBotBalance] = useState('1000')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    loadBots()
  }, [])

  const loadBots = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/bots')
      setBots(data)
    } catch (err) {
      setError('Failed to load bots')
    } finally {
      setLoading(false)
    }
  }

  const createBot = async (e) => {
    e.preventDefault()
    if (!newBotName.trim()) return
    setCreating(true)
    setError(null)
    try {
      const { data } = await api.post('/bots', {
        name: newBotName.trim(),
        initial_balance: parseFloat(newBotBalance) || 1000
      })
      setBots(prev => [data, ...prev])
      setNewBotName('')
      setNewBotBalance('1000')
      setShowCreate(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create bot')
    } finally {
      setCreating(false)
    }
  }

  const deleteBot = async (bot) => {
    try {
      await api.delete(`/bots/${bot.id}`)
      setBots(prev => prev.filter(b => b.id !== bot.id))
      setDeleteConfirm(null)
    } catch (err) {
      setError('Failed to delete bot')
    }
  }

  // Portfolio summary
  const totalBalance = bots.reduce((sum, b) => sum + b.current_balance, 0)
  const totalInitial = bots.reduce((sum, b) => sum + b.initial_balance, 0)
  const totalPnl = totalBalance - totalInitial

  return (
    <div className="min-h-screen grid-bg pt-20 px-4 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-orbitron font-black text-2xl text-cyber-cyan text-glow-cyan">
              DASHBOARD
            </h1>
            <p className="font-mono text-sm text-gray-500 mt-1">
              Welcome back, <span className="text-cyber-cyan">{user?.username}</span>
            </p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="btn-cyber-cyan text-sm px-5 py-2"
          >
            + New Bot
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 border border-cyber-pink p-3 font-mono text-sm text-cyber-pink">
            ⚠ {error}
            <button onClick={() => setError(null)} className="ml-3 text-gray-500 hover:text-white">✕</button>
          </div>
        )}

        {/* Portfolio summary */}
        {bots.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="cyber-card p-4">
              <p className="font-mono text-xs text-gray-500 mb-1">TOTAL BALANCE</p>
              <p className="font-orbitron font-bold text-xl text-cyber-cyan">${totalBalance.toFixed(2)}</p>
            </div>
            <div className="cyber-card p-4">
              <p className="font-mono text-xs text-gray-500 mb-1">TOTAL P&L</p>
              <p className={`font-orbitron font-bold text-xl ${totalPnl >= 0 ? 'badge-positive' : 'badge-negative'}`}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </p>
            </div>
            <div className="cyber-card p-4">
              <p className="font-mono text-xs text-gray-500 mb-1">ACTIVE BOTS</p>
              <p className="font-orbitron font-bold text-xl text-white">{bots.length}</p>
            </div>
          </div>
        )}

        {/* Create bot form */}
        {showCreate && (
          <div className="cyber-card p-6 mb-6 glow-cyan">
            <h2 className="font-orbitron text-cyber-cyan mb-4">CREATE NEW BOT</h2>
            <form onSubmit={createBot} className="flex gap-3">
              <input
                type="text"
                className="cyber-input w-[70%]"
                placeholder="Bot name..."
                value={newBotName}
                onChange={e => setNewBotName(e.target.value)}
                required
              />
              <input
                type="number"
                className="cyber-input w-24"
                placeholder="Balance"
                value={newBotBalance}
                onChange={e => setNewBotBalance(e.target.value)}
                min="10"
                max="100000"
              />
              <button
                type="submit"
                disabled={creating}
                className={`btn-cyber-cyan whitespace-nowrap ${creating ? 'opacity-50' : ''}`}
              >
                {creating ? 'Creating...' : 'Deploy Bot'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="btn-cyber-outline"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Bots grid */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <span className="font-mono text-cyber-cyan loading-glow">Loading bots...</span>
          </div>
        ) : bots.length === 0 ? (
          <div className="cyber-card p-12 text-center">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="font-orbitron text-cyber-cyan text-xl mb-3">No Bots Yet</h3>
            <p className="font-mono text-gray-500 mb-6">
              Create your first trading bot to get started with $1,000 virtual balance.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="btn-cyber-cyan px-8 py-3"
            >
              Create First Bot
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bots.map(bot => (
              <BotCard
                key={bot.id}
                bot={bot}
                onDelete={(b) => setDeleteConfirm(b)}
              />
            ))}
          </div>
        )}

        {/* Delete confirm modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <div className="cyber-card p-8 max-w-sm w-full mx-4 glow-pink">
              <h3 className="font-orbitron text-cyber-pink mb-4">DELETE BOT</h3>
              <p className="font-mono text-sm text-gray-400 mb-6">
                Are you sure you want to delete <span className="text-white">"{deleteConfirm.name}"</span>?
                All orders and positions will be lost.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => deleteBot(deleteConfirm)}
                  className="flex-1 btn-cyber-pink"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 btn-cyber-outline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
