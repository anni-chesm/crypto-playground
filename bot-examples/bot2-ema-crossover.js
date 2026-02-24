#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║       BOT 2 — EMA CROSSOVER TREND-FOLLOWING             ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  Timeframe   : 15m candles                              ║
 * ║  Indicators  : EMA(9) fast + EMA(21) slow               ║
 * ║  Buy  when   : EMA9 crosses ABOVE EMA21 (golden cross)  ║
 * ║  Sell when   : EMA9 crosses BELOW EMA21 (death cross)   ║
 * ║  Leverage    : 2x (moderate, amplified returns)         ║
 * ║  Sizing      : 15% of balance per entry (margin)        ║
 * ║  Confirmation: Also checks EMA21 slope (trend filter)   ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * HOW IT WORKS:
 *   The EMA crossover is one of the most classic trend-following
 *   strategies. When the fast EMA (9) rises above the slow EMA (21),
 *   the market is gaining momentum → we buy. When it falls below,
 *   momentum reverses → we sell. The slope filter avoids false signals
 *   in sideways markets.
 *
 * USAGE:
 *   API_TOKEN=<your-bot-token> node bot2-ema-crossover.js
 *
 * ENVIRONMENT VARIABLES:
 *   BASE_URL           Platform URL          (default: https://192.168.1.19:8001)
 *   API_TOKEN          Your bot's API token   (REQUIRED)
 *   SYMBOL             Trading pair           (default: ETH)
 *   EMA_FAST           Fast EMA period        (default: 9)
 *   EMA_SLOW           Slow EMA period        (default: 21)
 *   LEVERAGE           Leverage multiplier    (default: 2)
 *   POSITION_PCT       % of balance per trade (default: 15)
 *   MIN_SLOPE_PCT      Minimum EMA21 slope %  (default: 0.05)
 *   POLL_INTERVAL_MS   Loop interval in ms    (default: 60000)
 *   DRY_RUN            Set to "true" to skip real orders
 */

'use strict';

const https = require('https');
const { URL } = require('url');

// ── CONFIG ─────────────────────────────────────────────────
const BASE_URL     = (process.env.BASE_URL || 'https://192.168.1.19:8001').replace(/\/$/, '');
const API_TOKEN    = process.env.API_TOKEN || '';
const SYMBOL       = (process.env.SYMBOL || 'ETH').toUpperCase();
const EMA_FAST     = parseInt(process.env.EMA_FAST  || '9');
const EMA_SLOW     = parseInt(process.env.EMA_SLOW  || '21');
const LEVERAGE     = parseInt(process.env.LEVERAGE  || '2');
const POSITION_PCT = parseFloat(process.env.POSITION_PCT   || '15') / 100;
const MIN_SLOPE    = parseFloat(process.env.MIN_SLOPE_PCT  || '0.05') / 100;
const POLL_MS      = parseInt(process.env.POLL_INTERVAL_MS || '60000');
const DRY_RUN      = process.env.DRY_RUN === 'true';

// ── STATE ──────────────────────────────────────────────────
let iteration  = 0;
let prevCross  = null; // 'above' | 'below' | null — last known cross state

// ── UTILS ──────────────────────────────────────────────────

function log(level, msg, data = null) {
  const ts = new Date().toISOString();
  const prefix = { INFO: '📈', WARN: '⚠️ ', ERROR: '❌', TRADE: '💰', DRY: '🔵', SIGNAL: '⚡' }[level] || '  ';
  const line = data
    ? `[${ts}] ${prefix} [${level}] ${msg} ${JSON.stringify(data)}`
    : `[${ts}] ${prefix} [${level}] ${msg}`;
  console.log(line);
}

// HTTP helper — supports self-signed TLS
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url   = new URL(BASE_URL + path);
    const isSSL = url.protocol === 'https:';
    const opts  = {
      hostname: url.hostname,
      port:     url.port || (isSSL ? 443 : 80),
      path:     url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
      rejectUnauthorized: false, // allow self-signed certs
    };
    if (token) opts.headers['X-API-Token'] = token;
    if (body)  opts.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));

    const lib = isSSL ? https : require('http');
    const req = lib.request(opts, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          if (res.statusCode >= 400) reject(json);
          else resolve(json);
        } catch {
          reject(new Error(`Non-JSON response (${res.statusCode}): ${raw.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── INDICATORS ─────────────────────────────────────────────

/**
 * Compute EMA (Exponential Moving Average) for a series of closes.
 * Returns an array of EMA values aligned with the input closes.
 */
function computeEMA(closes, period) {
  if (closes.length < period) return [];

  const k = 2 / (period + 1);
  const result = [];

  // Seed: first EMA = SMA of first `period` values
  const seed = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(seed);

  for (let i = period; i < closes.length; i++) {
    result.push(closes[i] * k + result[result.length - 1] * (1 - k));
  }

  return result;
}

/**
 * Slope of the last N values as percentage change per bar.
 */
function slope(series, n = 3) {
  if (series.length < n) return 0;
  const s = series.slice(-n);
  return (s[s.length - 1] - s[0]) / s[0] / n;
}

// Determine cross state between fast and slow EMA
function getCrossState(fastLast, slowLast) {
  return fastLast > slowLast ? 'above' : 'below';
}

// ── API CALLS ──────────────────────────────────────────────

async function getCandles(symbol, interval, limit) {
  return request('GET', `/api/crypto/${symbol}/candles?interval=${interval}&limit=${limit}`);
}

async function getPositions() {
  return request('GET', '/api/trading/positions', null, API_TOKEN);
}

async function executeBuy(symbol, quantity) {
  if (DRY_RUN) {
    log('DRY', `DRY_RUN: BUY ${quantity} ${symbol} x${LEVERAGE}`);
    return { dry_run: true };
  }
  return request('POST', '/api/trading/buy', { symbol, quantity, leverage: LEVERAGE }, API_TOKEN);
}

async function executeSell(symbol, quantity) {
  if (DRY_RUN) {
    log('DRY', `DRY_RUN: SELL ${quantity} ${symbol}`);
    return { dry_run: true };
  }
  return request('POST', '/api/trading/sell', { symbol, quantity }, API_TOKEN);
}

// ── STRATEGY ───────────────────────────────────────────────

async function runStrategy() {
  iteration++;
  log('INFO', `── Iteration #${iteration} ──────────────────────`);

  // 1. Fetch candles (need enough for slow EMA + slope window)
  const limit = EMA_SLOW + 50;
  let candles;
  try {
    candles = await getCandles(SYMBOL, '15m', limit);
  } catch (err) {
    log('ERROR', 'Failed to fetch candles', err);
    return;
  }

  const closes = candles.map(c => c.close);
  const currentPrice = closes[closes.length - 1];

  // 2. Compute EMAs
  const emaFastArr = computeEMA(closes, EMA_FAST);
  const emaSlowArr = computeEMA(closes, EMA_SLOW);

  if (emaFastArr.length < 2 || emaSlowArr.length < 2) {
    log('WARN', 'Not enough data to compute EMAs');
    return;
  }

  const emaFast = emaFastArr[emaFastArr.length - 1];
  const emaSlow = emaSlowArr[emaSlowArr.length - 1];
  const emaFastPrev = emaFastArr[emaFastArr.length - 2];
  const emaSlowPrev = emaSlowArr[emaSlowArr.length - 2];

  const spread = ((emaFast - emaSlow) / emaSlow * 100).toFixed(4);
  const emaSlowSlope = slope(emaSlowArr, 3);

  log('INFO', `${SYMBOL} | Price: $${currentPrice.toFixed(2)} | EMA${EMA_FAST}: $${emaFast.toFixed(2)} | EMA${EMA_SLOW}: $${emaSlow.toFixed(2)} | Spread: ${spread}%`);
  log('INFO', `EMA${EMA_SLOW} slope: ${(emaSlowSlope * 100).toFixed(4)}% | Min required: ${(MIN_SLOPE * 100).toFixed(4)}%`);

  // 3. Detect cross
  const currentCross = getCrossState(emaFast, emaSlow);
  const prevBarCross = getCrossState(emaFastPrev, emaSlowPrev);
  const crossedUp   = currentCross === 'above' && prevBarCross === 'below';
  const crossedDown = currentCross === 'below'  && prevBarCross === 'above';

  // 4. Check current position
  let positions;
  try {
    positions = await getPositions();
  } catch (err) {
    log('ERROR', 'Failed to fetch positions', err);
    return;
  }

  const position = positions.find(p => p.symbol === SYMBOL);

  // ── SELL logic: death cross ─────────────────────────────
  if (position && position.quantity > 0) {
    const entryPrice = position.avg_entry_price;
    const pnlPct = (currentPrice - entryPrice) / entryPrice;

    log('INFO', `Open position: ${position.quantity.toFixed(6)} ${SYMBOL} @ $${entryPrice.toFixed(2)} | P&L: ${(pnlPct * 100).toFixed(2)}% (x${LEVERAGE} effective)`);

    if (crossedDown) {
      log('SIGNAL', `💀 DEATH CROSS: EMA${EMA_FAST} crossed BELOW EMA${EMA_SLOW} — selling`);
      try {
        const res = await executeSell(SYMBOL, position.quantity);
        log('TRADE', `Sold ${position.quantity.toFixed(6)} ${SYMBOL}`, res);
        prevCross = 'below';
      } catch (err) {
        log('ERROR', 'Sell (death cross) failed', err);
      }
      return;
    }

    // Still holding — report state
    const crossLabel = currentCross === 'above' ? `EMA${EMA_FAST} above EMA${EMA_SLOW} ✅` : `EMA${EMA_FAST} below EMA${EMA_SLOW} ⚡`;
    log('INFO', `Holding. ${crossLabel}`);
    prevCross = currentCross;
    return;
  }

  // ── BUY logic: golden cross ─────────────────────────────
  if (crossedUp) {
    // Trend filter: require EMA21 slope to be positive (not just sideways noise)
    if (Math.abs(emaSlowSlope) < MIN_SLOPE && emaSlowSlope <= 0) {
      log('WARN', `Golden cross detected but EMA${EMA_SLOW} slope too flat (${(emaSlowSlope * 100).toFixed(4)}%) — skipping`);
      prevCross = 'above';
      return;
    }

    log('SIGNAL', `✨ GOLDEN CROSS: EMA${EMA_FAST} crossed ABOVE EMA${EMA_SLOW} — buying!`);

    // Position sizing: 15% of assumed balance (1000 default), divided by price
    const estimatedBalance = 1000; // fallback; ideally read from bot info
    const notionalTarget = estimatedBalance * POSITION_PCT * LEVERAGE;
    const quantity = parseFloat((notionalTarget / currentPrice).toFixed(6));

    if (quantity <= 0) {
      log('WARN', 'Computed quantity is 0, skipping');
      return;
    }

    log('TRADE', `Buying ${quantity} ${SYMBOL} @ ~$${currentPrice.toFixed(2)} | Leverage: x${LEVERAGE}`);
    try {
      const res = await executeBuy(SYMBOL, quantity);
      log('TRADE', `Buy order executed`, res);
      prevCross = 'above';
    } catch (err) {
      log('ERROR', 'Buy failed', err);
    }
    return;
  }

  // No signal
  const stateDesc = currentCross === 'above'
    ? `EMA${EMA_FAST} > EMA${EMA_SLOW} (bullish, waiting for fresh cross)`
    : `EMA${EMA_FAST} < EMA${EMA_SLOW} (bearish, waiting for golden cross)`;
  log('INFO', `No signal. ${stateDesc}`);
  prevCross = currentCross;
}

// ── MAIN LOOP ──────────────────────────────────────────────

async function main() {
  if (!API_TOKEN) {
    console.error('❌ API_TOKEN is required. Set it via environment variable.');
    console.error('   Example: API_TOKEN=your-token node bot2-ema-crossover.js');
    process.exit(1);
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       BOT 2 — EMA CROSSOVER TREND-FOLLOWING             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Symbol      : ${SYMBOL}`);
  console.log(`  Fast EMA    : EMA(${EMA_FAST})`);
  console.log(`  Slow EMA    : EMA(${EMA_SLOW})`);
  console.log(`  Timeframe   : 15m`);
  console.log(`  Leverage    : x${LEVERAGE}`);
  console.log(`  Position %  : ${POSITION_PCT * 100}% of balance`);
  console.log(`  Slope filter: >${(MIN_SLOPE * 100).toFixed(4)}% per bar`);
  console.log(`  Poll every  : ${POLL_MS / 1000}s`);
  console.log(`  Platform    : ${BASE_URL}`);
  console.log(`  Dry run     : ${DRY_RUN}`);
  console.log('');

  await runStrategy();
  setInterval(runStrategy, POLL_MS);
}

main().catch(err => {
  log('ERROR', 'Fatal error', err);
  process.exit(1);
});
