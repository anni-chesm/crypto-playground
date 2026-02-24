import { Link } from 'react-router-dom'

export default function BotCard({ bot, onDelete }) {
  const pnl = parseFloat(bot.pnl || 0)
  const pnlPct = parseFloat(bot.pnl_pct || 0)
  const isPositive = pnl >= 0

  return (
    <div className="cyber-card p-5 relative group">
      {/* Status indicator */}
      <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${isPositive ? 'bg-cyber-green glow-green' : 'bg-cyber-pink'}`} 
        style={{ boxShadow: isPositive ? '0 0 8px rgba(57, 255, 20, 0.8)' : '0 0 8px rgba(255, 0, 110, 0.8)' }} />

      {/* Header */}
      <div className="mb-4">
        <h3 className="font-orbitron font-bold text-white text-lg mb-1">{bot.name}</h3>
        <p className="font-mono text-xs text-gray-500 truncate">
          ID: {bot.id} · Created {new Date(bot.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-black bg-opacity-30 p-3 border border-cyber-border">
          <p className="font-mono text-xs text-gray-500 mb-1">BALANCE</p>
          <p className="font-mono text-cyber-cyan font-bold">${parseFloat(bot.current_balance).toFixed(2)}</p>
        </div>
        <div className="bg-black bg-opacity-30 p-3 border border-cyber-border">
          <p className="font-mono text-xs text-gray-500 mb-1">P&L</p>
          <p className={`font-mono font-bold ${isPositive ? 'badge-positive' : 'badge-negative'}`}>
            {isPositive ? '+' : ''}{pnl.toFixed(2)} ({isPositive ? '+' : ''}{pnlPct}%)
          </p>
        </div>
        <div className="bg-black bg-opacity-30 p-3 border border-cyber-border">
          <p className="font-mono text-xs text-gray-500 mb-1">POSITIONS</p>
          <p className="font-mono text-white">{bot.active_positions || 0}</p>
        </div>
        <div className="bg-black bg-opacity-30 p-3 border border-cyber-border">
          <p className="font-mono text-xs text-gray-500 mb-1">OPEN ORDERS</p>
          <p className="font-mono text-white">{bot.open_orders || 0}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          to={`/bots/${bot.id}`}
          className="flex-1 text-center btn-cyber-outline text-xs px-3 py-2"
        >
          Details
        </Link>
        <button
          onClick={() => onDelete(bot)}
          className="btn-cyber-pink text-xs px-3 py-2"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
