# 🤖 CryptoPlayground — Bot Examples

Example trading bots that connect to the CryptoPlayground REST API.
These are **educational examples** — they trade with simulated money on the platform.

---

## Prerequisites

- Node.js 18+ (uses native `fetch` / `https`)
- A running CryptoPlayground instance
- A registered account + at least one bot created via the UI

---

## Setup

### 1. Create a bot on the platform

1. Open `https://192.168.1.19:8001`
2. Register / log in
3. Click **"New Bot"** → give it a name and initial balance
4. Copy the **API Token** shown in the bot detail view

### 2. Run a bot

```bash
# Bot 1 — RSI Mean Reversion (BTC, 1h candles)
API_TOKEN=your-api-token node bot1-rsi-reversion.js

# Bot 2 — EMA Crossover (ETH, 15m candles)
API_TOKEN=your-api-token node bot2-ema-crossover.js
```

Both bots work with **zero npm installs** — they only use Node.js built-ins.

---

## Bot 1 — RSI Mean Reversion

**File:** `bot1-rsi-reversion.js`

### Strategy

The RSI (Relative Strength Index) measures the speed and magnitude of recent price changes.
This bot exploits **mean reversion**: when an asset becomes oversold, it tends to recover.

```
RSI < 35  → BUY  (market is oversold, likely to bounce)
RSI > 65  → SELL (market is overbought, likely to correct)
P&L < -5% → SELL (stop-loss to limit losses)
```

### Configuration

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `https://192.168.1.19:8001` | Platform URL |
| `API_TOKEN` | *(required)* | Your bot's API token |
| `SYMBOL` | `BTC` | Coin to trade |
| `RSI_PERIOD` | `14` | RSI lookback period |
| `RSI_OVERSOLD` | `35` | RSI buy threshold |
| `RSI_OVERBOUGHT` | `65` | RSI sell threshold |
| `POSITION_PCT` | `10` | % of balance per trade |
| `STOP_LOSS_PCT` | `5` | Stop-loss trigger (%) |
| `POLL_INTERVAL_MS` | `60000` | Check interval (ms) |
| `DRY_RUN` | `false` | Skip real orders if `true` |

### Example (custom config)

```bash
API_TOKEN=abc123 \
SYMBOL=SOL \
RSI_OVERSOLD=30 \
RSI_OVERBOUGHT=70 \
STOP_LOSS_PCT=3 \
POLL_INTERVAL_MS=30000 \
node bot1-rsi-reversion.js
```

### Sample output

```
[2026-02-24T16:00:00Z] 📊 [INFO] ── Iteration #1 ──────────────────────
[2026-02-24T16:00:01Z] 📊 [INFO] BTC | Price: $94832.10 | RSI(14): 28.43
[2026-02-24T16:00:01Z] 💰 [TRADE] 🟢 BUY signal: RSI 28.43 < 35 (oversold)
[2026-02-24T16:00:01Z] 💰 [TRADE] Buying 0.001054 BTC @ ~$94832.10 {"success":true,...}
```

---

## Bot 2 — EMA Crossover (Trend Following)

**File:** `bot2-ema-crossover.js`

### Strategy

Uses two Exponential Moving Averages (EMA) to detect trend changes:

- **Fast EMA(9)** reacts quickly to price changes
- **Slow EMA(21)** represents the medium-term trend

```
EMA9 crosses ABOVE EMA21 → Golden Cross → BUY  (bullish momentum)
EMA9 crosses BELOW EMA21 → Death Cross  → SELL (bearish reversal)
```

A **slope filter** on EMA21 avoids entering trades in choppy sideways markets.

### Configuration

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `https://192.168.1.19:8001` | Platform URL |
| `API_TOKEN` | *(required)* | Your bot's API token |
| `SYMBOL` | `ETH` | Coin to trade |
| `EMA_FAST` | `9` | Fast EMA period |
| `EMA_SLOW` | `21` | Slow EMA period |
| `LEVERAGE` | `2` | Leverage multiplier (max 40x) |
| `POSITION_PCT` | `15` | % of balance per trade |
| `MIN_SLOPE_PCT` | `0.05` | Minimum EMA21 slope to confirm trend |
| `POLL_INTERVAL_MS` | `60000` | Check interval (ms) |
| `DRY_RUN` | `false` | Skip real orders if `true` |

### Example (custom config)

```bash
API_TOKEN=abc123 \
SYMBOL=BTC \
EMA_FAST=12 \
EMA_SLOW=26 \
LEVERAGE=3 \
POSITION_PCT=20 \
DRY_RUN=true \
node bot2-ema-crossover.js
```

### Sample output

```
[2026-02-24T16:00:00Z] 📈 [INFO] ── Iteration #1 ──────────────────────
[2026-02-24T16:00:01Z] 📈 [INFO] ETH | Price: $2743.50 | EMA9: $2741.20 | EMA21: $2738.90 | Spread: 0.0839%
[2026-02-24T16:00:01Z] 📈 [INFO] EMA21 slope: 0.0132% | Min required: 0.0500%
[2026-02-24T16:00:01Z] ⚡ [SIGNAL] ✨ GOLDEN CROSS: EMA9 crossed ABOVE EMA21 — buying!
[2026-02-24T16:00:01Z] 💰 [TRADE] Buying 0.001093 ETH @ ~$2743.50 | Leverage: x2
```

---

## API Reference

These bots use the following platform endpoints:

### Market Data (public, no auth)

```
GET /api/crypto/{symbol}/price
GET /api/crypto/{symbol}/candles?interval=15m&limit=100
```

### Trading (requires X-API-Token header)

```
POST /api/trading/buy
  Body: { symbol, quantity, leverage }

POST /api/trading/sell
  Body: { symbol, quantity }

GET  /api/trading/positions
GET  /api/trading/orders
```

---

## Tips

- Use `DRY_RUN=true` to test your strategy without placing real orders
- Adjust `POLL_INTERVAL_MS` to match the candle interval (e.g., for 15m candles, polling every 60s is fine; for 1h candles, every 5 minutes is enough)
- The bots use **no external npm packages** — just Node.js built-ins
- For production use, consider adding a proper logging library and persistent state storage
