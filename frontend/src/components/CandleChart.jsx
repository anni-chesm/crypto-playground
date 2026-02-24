import { useEffect, useRef, useState, useCallback } from 'react'
import { createChart } from 'lightweight-charts'
import api from '../api/client'

const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d', '1w']
const REFRESH_MS = 10000

export default function CandleChart({ symbol }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const isFirstLoadRef = useRef(true)
  const [interval, setInterval] = useState('1d')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Create chart
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0a0a0f' },
        textColor: '#00f5ff',
      },
      grid: {
        vertLines: { color: 'rgba(0, 245, 255, 0.05)' },
        horzLines: { color: 'rgba(0, 245, 255, 0.05)' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: 'rgba(0, 245, 255, 0.4)', style: 1 },
        horzLine: { color: 'rgba(0, 245, 255, 0.4)', style: 1 },
      },
      rightPriceScale: {
        borderColor: 'rgba(0, 245, 255, 0.2)',
      },
      timeScale: {
        borderColor: 'rgba(0, 245, 255, 0.2)',
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: 400,
    })

    const series = chart.addCandlestickSeries({
      upColor: '#39ff14',
      downColor: '#ff006e',
      borderUpColor: '#39ff14',
      borderDownColor: '#ff006e',
      wickUpColor: '#39ff14',
      wickDownColor: '#ff006e',
    })

    chartRef.current = chart
    seriesRef.current = series

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
    }
  }, [])

  const loadCandles = useCallback(async (silent = false) => {
    if (!symbol || !seriesRef.current) return
    if (!silent) setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`/crypto/${symbol}/candles?interval=${interval}&limit=200`)
      if (seriesRef.current && data.length > 0) {
        seriesRef.current.setData(data)
        // Only fit content on first load or interval change, not on silent refresh
        if (isFirstLoadRef.current) {
          chartRef.current.timeScale().fitContent()
          isFirstLoadRef.current = false
        }
      }
      setLastUpdate(new Date().toLocaleTimeString())
    } catch (err) {
      if (!silent) setError(err.response?.data?.error || 'Failed to load candles')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [symbol, interval])

  // Load on symbol or interval change
  useEffect(() => {
    isFirstLoadRef.current = true
    loadCandles(false)
  }, [symbol, interval])

  // Auto-refresh every 10s (silent)
  useEffect(() => {
    const id = setInterval(() => loadCandles(true), REFRESH_MS)
    return () => clearInterval(id)
  }, [loadCandles])

  return (
    <div className="cyber-card p-4">
      {/* Interval selector */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-orbitron text-cyber-cyan text-sm uppercase tracking-wider">
            {symbol} Chart
          </h3>
          {lastUpdate && (
            <p className="font-mono text-xs text-gray-600 mt-0.5">
              ↻ {lastUpdate}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          {INTERVALS.map(iv => (
            <button
              key={iv}
              onClick={() => setInterval(iv)}
              className={`px-2 py-1 text-xs font-mono transition-all ${
                interval === iv
                  ? 'text-cyber-bg bg-cyber-cyan'
                  : 'text-cyber-cyan border border-cyber-border hover:border-cyber-cyan'
              }`}
            >
              {iv}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-10 mb-2">
          <span className="font-mono text-cyber-cyan loading-glow text-sm">Loading chart data...</span>
        </div>
      )}

      {error && (
        <div className="mb-2 p-2 border border-cyber-pink text-cyber-pink font-mono text-xs">
          ⚠ {error}
        </div>
      )}

      <div ref={containerRef} className="w-full" />
    </div>
  )
}
