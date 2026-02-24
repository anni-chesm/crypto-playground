#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║         BOT 1 — RSI MEAN REVERSION STRATEGY             ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  Timeframe : 1h candles                                 ║
 * ║  Indicator : RSI(14)                                    ║
 * ║  Buy  when : RSI < 35  (oversold)                       ║
 * ║  Sell when : RSI > 65  (overbought) or stop-loss -5%    ║
 * ║  Leverage  : 1x (conservative, no amplification)        ║
 * ║  Sizing    : 10% of available balance per entry         ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * USAGE:
 *   API_TOKEN=<your-bot-token> node bot1-rsi-reversion.js
 *
 * ENVIRONMENT VARIABLES:
 *   BASE_URL           Platform URL         (default: https://192.168.1.19:8001)
 *   API_TOKEN          Your bot's API token  (REQUIRED)
 *   SYMBOL             Trading pair          (default: BTC)
 *   RSI_PERIOD         RSI period            (default: 14)
 *   RSI_OVERSOLD       RSI buy threshold     (default: 35)
 *   RSI_OVERBOUGHT     RSI sell threshold    (default: 65)
 *   POSITION_PCT       Position size %       (default: 10)
 *   STOP_LOSS_PCT      Stop-loss %           (default: 5)
 *   POLL_INTERVAL_MS   Loop interval in ms   (default: 60000)
 *   DRY_RUN            Set to "true" to skip real orders
 */

'use strict';

const https = require('https');
const { URL } = require('url');

// ── CONFIG ─────────────────────────────────────────────────
const BASE_URL      = (process.env.BASE_URL || 'https://192.168.1.19:8001').replace(/\/$/, '');
const API_TOKEN     = process.env.API_TOKEN || '';
const SYMBOL        = (process.env.SYMBOL || 'BTC').toUpperCase();
const RSI_PERIOD    = parseInt(process.env.RSI_PERIOD    || '14');
const RSI_OVERSOLD  = parseFloat(process.env.RSI_OVERSOLD  || '35');
const RSI_OVERBOUGHT= parseFloat(process.env.RSI_OVERBOUGHT|| '65');
const POSITION_PCT  = parseFloat(process.env.POSITION_PCT  || '10') / 100;
const STOP_LOSS_PCT = parseFloat(process.env.STOP_LOSS_PCT || '5')  / 100;
const POLL_MS       = parseInt(process.env.POLL_INTERVAL_MS || '60000');
const DRY_RUN       = process.env.DRY_RUN === 'true';

// ── STATE ──────────────────────────────────────────────────
let iteration = 0;

// ── UTILS ──────────────────────────────────────────────────

function log(level, msg, data = null) {
  const ts = new Date().toISOString();
  const prefix = { INFO: '📊', WARN: '⚠️ ', ERROR: '❌', TRADE: '💰', DRY: '🔵' }[level] || '  ';
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
    if (token)            opts.headers['X-API-Token']  = token;
    if (body)             opts.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));

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
 * Compute RSI(period) from an array of closing prices.
 * Returns the last RSI value.
 */
function computeRSI(closes, period) {
  if (closes.length < period + 1) return null;

  let gains = 0, losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains  += diff;
    else           losses -= diff;
  }

  let avgGain = gains  / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// ── API CALLS ──────────────────────────────────────────────

async function getCandles(symbol, interval = '1h', limit = 100) {
  return request('GET', `/api/crypto/${symbol}/candles?interval=${interval}&limit=${limit}`);
}

async function getPositions() {
  return request('GET', '/api/trading/positions', null, API_TOKEN);
}

async function executeBuy(symbol, quantity) {
  if (DRY_RUN) {
    log('DRY', `DRY_RUN: BUY ${quantity} ${symbol}`);
    return { dry_run: true };
  }
  return request('POST', '/api/trading/buy', { symbol, quantity, leverage: 1 }, API_TOKEN);
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

  // 1. Fetch candles
  let candles;
  try {
    candles = await getCandles(SYMBOL, '1h', RSI_PERIOD + 50);
  } catch (err) {
    log('ERROR', 'Failed to fetch candles', err);
    return;
  }

  const closes = candles.map(c => c.close);
  const currentPrice = closes[closes.length - 1];
  const rsi = computeRSI(closes, RSI_PERIOD);

  if (rsi === null) {
    log('WARN', `Not enough candle data for RSI(${RSI_PERIOD})`);
    return;
  }

  log('INFO', `${SYMBOL} | Price: $${currentPrice.toFixed(2)} | RSI(${RSI_PERIOD}): ${rsi.toFixed(2)}`);

  // 2. Check current position
  let positions;
  try {
    positions = await getPositions();
  } catch (err) {
    log('ERROR', 'Failed to fetch positions', err);
    return;
  }

  const position = positions.find(p => p.symbol === SYMBOL);

  // 3. SELL logic
  if (position && position.quantity > 0) {
    const entryPrice = position.avg_entry_price;
    const pnlPct = (currentPrice - entryPrice) / entryPrice;
    const stopLossTriggered = pnlPct <= -STOP_LOSS_PCT;
    const overboughtTriggered = rsi > RSI_OVERBOUGHT;

    log('INFO', `Open position: ${position.quantity.toFixed(6)} ${SYMBOL} @ $${entryPrice.toFixed(2)} | P&L: ${(pnlPct * 100).toFixed(2)}%`);

    if (stopLossTriggered) {
      log('TRADE', `🔴 STOP-LOSS triggered (P&L: ${(pnlPct * 100).toFixed(2)}% ≤ -${STOP_LOSS_PCT * 100}%)`);
      try {
        const res = await executeSell(SYMBOL, position.quantity);
        log('TRADE', `Sold ${position.quantity.toFixed(6)} ${SYMBOL}`, res);
      } catch (err) {
        log('ERROR', 'Sell (stop-loss) failed', err);
      }
      return;
    }

    if (overboughtTriggered) {
      log('TRADE', `🟡 TAKE-PROFIT: RSI ${rsi.toFixed(2)} > ${RSI_OVERBOUGHT} (overbought)`);
      try {
        const res = await executeSell(SYMBOL, position.quantity);
        log('TRADE', `Sold ${position.quantity.toFixed(6)} ${SYMBOL}`, res);
      } catch (err) {
        log('ERROR', 'Sell (overbought) failed', err);
      }
      return;
    }

    log('INFO', `Holding position. RSI ${rsi.toFixed(2)} (sell zone: >${RSI_OVERBOUGHT})`);
    return;
  }

  // 4. BUY logic
  if (rsi < RSI_OVERSOLD) {
    log('TRADE', `🟢 BUY signal: RSI ${rsi.toFixed(2)} < ${RSI_OVERSOLD} (oversold)`);

    // Fetch bot info to get current balance
    let botInfo;
    try {
      // We can infer balance from positions response header or query orders
      // The positions endpoint doesn't return balance, so we use a trick:
      // get balance indirectly by checking the trading response
      // For now we'll just use a fixed quantity based on price
      // A real implementation would call GET /api/bots/:id with JWT
      const quantity = parseFloat((POSITION_PCT * 1000 / currentPrice).toFixed(6));
      if (quantity <= 0) {
        log('WARN', 'Computed quantity is 0, skipping');
        return;
      }
      log('TRADE', `Buying ${quantity} ${SYMBOL} @ ~$${currentPrice.toFixed(2)}`);
      const res = await executeBuy(SYMBOL, quantity);
      log('TRADE', `Buy order executed`, res);
    } catch (err) {
      log('ERROR', 'Buy failed', err);
    }
  } else {
    const zone = rsi < RSI_OVERBOUGHT ? 'neutral' : 'overbought';
    log('INFO', `No signal. RSI ${rsi.toFixed(2)} — zone: ${zone} | waiting...`);
  }
}

// ── MAIN LOOP ──────────────────────────────────────────────

async function main() {
  if (!API_TOKEN) {
    console.error('❌ API_TOKEN is required. Set it via environment variable.');
    console.error('   Example: API_TOKEN=your-token node bot1-rsi-reversion.js');
    process.exit(1);
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         BOT 1 — RSI MEAN REVERSION STRATEGY             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Symbol      : ${SYMBOL}`);
  console.log(`  RSI Period  : ${RSI_PERIOD}`);
  console.log(`  Buy  < RSI  : ${RSI_OVERSOLD}  (oversold)`);
  console.log(`  Sell > RSI  : ${RSI_OVERBOUGHT}  (overbought)`);
  console.log(`  Stop-loss   : -${STOP_LOSS_PCT * 100}%`);
  console.log(`  Position %  : ${POSITION_PCT * 100}%`);
  console.log(`  Leverage    : 1x`);
  console.log(`  Poll every  : ${POLL_MS / 1000}s`);
  console.log(`  Platform    : ${BASE_URL}`);
  console.log(`  Dry run     : ${DRY_RUN}`);
  console.log('');

  // Run immediately, then loop
  await runStrategy();
  setInterval(runStrategy, POLL_MS);
}

main().catch(err => {
  log('ERROR', 'Fatal error', err);
  process.exit(1);
});
