import { useEffect, useRef, useState, useCallback } from 'react'
import { createChart } from 'lightweight-charts'
import api from '../api/client'

const HOURS_OPTIONS = [3, 4, 5, 6]

export default function PortfolioChart() {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesMapRef = useRef({}) // botId -> series
  const [hours, setHours] = useState(6)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [legend, setLegend] = useState([]) // [{ id, name, color, balance }]

  // Init chart once
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0a0a0f' },
        textColor: '#9ca3af',
        fontFamily: '"Share Tech Mono", monospace',
      },
      grid: {
        vertLines: { color: 'rgba(0, 245, 255, 0.04)' },
        horzLines: { color: 'rgba(0, 245, 255, 0.04)' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: 'rgba(0, 245, 255, 0.5)', style: 1, width: 1 },
        horzLine: { color: 'rgba(0, 245, 255, 0.5)', style: 1, width: 1 },
      },
      rightPriceScale: {
        borderColor: 'rgba(0, 245, 255, 0.15)',
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: 'rgba(0, 245, 255, 0.15)',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 6,
        minBarSpacing: 3,
      },
      width: containerRef.current.clientWidth,
      height: 320,
    })

    chartRef.current = chart

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      seriesMapRef.current = {}
      chart.remove()
      chartRef.current = null
    }
  }, [])

  const loadData = useCallback(async () => {
    if (!chartRef.current) return
    setError(null)
    try {
      const { data } = await api.get(`/bots/chart-data?hours=${hours}`)

      const chart = chartRef.current
      const incomingIds = new Set(data.bots.map(b => b.id))

      // Remove stale series
      for (const [botId, series] of Object.entries(seriesMapRef.current)) {
        if (!incomingIds.has(parseInt(botId))) {
          chart.removeSeries(series)
          delete seriesMapRef.current[botId]
        }
      }

      const newLegend = []

      data.bots.forEach((bot) => {
        let series = seriesMapRef.current[bot.id]

        if (!series) {
          series = chart.addLineSeries({
            color: bot.color,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: true,
            title: bot.name,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 5,
            autoscaleInfoProvider: () => ({
              priceRange: { minValue: 800, maxValue: 1200 },
              margins: { above: 0.15, below: 0.15 },
            }),
          })
          seriesMapRef.current[bot.id] = series
        } else {
          series.applyOptions({ color: bot.color })
        }

        if (bot.series.length > 0) {
          series.setData(bot.series)
        }

        // Markers: deduplicate by time keeping last entry
        if (bot.markers.length > 0) {
          const markerMap = new Map()
          bot.markers.forEach(m => {
            markerMap.set(m.time, {
              time: m.time,
              position: m.type === 'buy' ? 'belowBar' : 'aboveBar',
              color: m.type === 'buy' ? '#39ff14' : '#ff006e',
              shape: m.type === 'buy' ? 'arrowUp' : 'arrowDown',
              text: `${m.type === 'buy' ? '▲' : '▼'} ${m.symbol}`,
            })
          })
          const markers = Array.from(markerMap.values()).sort((a, b) => a.time - b.time)
          series.setMarkers(markers)
        } else {
          series.setMarkers([])
        }

        newLegend.push({
          id: bot.id,
          name: bot.name,
          color: bot.color,
          balance: bot.currentBalance,
        })
      })

      chart.timeScale().fitContent()
      setLegend(newLegend)
      setLastUpdate(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load chart data')
    } finally {
      setLoading(false)
    }
  }, [hours])

  // Load on mount and hours change
  useEffect(() => {
    setLoading(true)
    loadData()
  }, [loadData])

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(loadData, 30000)
    return () => clearInterval(id)
  }, [loadData])

  return (
    <div className="cyber-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="font-orbitron font-bold text-cyber-cyan text-sm uppercase tracking-widest">
            PORTFOLIO EVOLUTION
          </h2>
          <p className="font-mono text-xs text-gray-600 mt-0.5">
            Balance progression · 10 min intervals
            {lastUpdate && <span className="ml-2 text-gray-700">· updated {lastUpdate}</span>}
          </p>
        </div>

        {/* Time range selector */}
        <div className="flex gap-1">
          {HOURS_OPTIONS.map(h => (
            <button
              key={h}
              onClick={() => { setLoading(true); setHours(h) }}
              className={`px-3 py-1 text-xs font-mono transition-all ${
                hours === h
                  ? 'text-cyber-bg bg-cyber-cyan'
                  : 'text-cyber-cyan border border-cyber-border hover:border-cyber-cyan'
              }`}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-8 mb-2">
          <span className="font-mono text-cyber-cyan loading-glow text-xs">Loading portfolio data...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-3 p-2 border border-cyber-pink text-cyber-pink font-mono text-xs">
          ⚠ {error}
        </div>
      )}

      {/* Chart */}
      <div ref={containerRef} className="w-full" />

      {/* Legend */}
      {legend.length > 0 && (
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-cyber-border">
          {legend.map(bot => (
            <div key={bot.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: bot.color, boxShadow: `0 0 6px ${bot.color}` }}
              />
              <span className="font-mono text-xs text-gray-400">{bot.name}</span>
              <span
                className="font-orbitron text-xs font-bold"
                style={{ color: bot.color }}
              >
                ${bot.balance.toFixed(2)}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-green-400 text-xs">▲</span>
              <span className="font-mono text-xs text-gray-500">Buy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-cyber-pink text-xs">▼</span>
              <span className="font-mono text-xs text-gray-500">Sell</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
