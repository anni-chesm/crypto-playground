# 🚀 CryptoPlayground

> A self-hosted crypto trading simulator. Build, test and run automated trading bots with real market data — no real money involved.

![Stack](https://img.shields.io/badge/stack-React%20%2B%20Node.js%20%2B%20SQLite-00f5ff?style=flat-square)
![Docker](https://img.shields.io/badge/deploy-Docker%20Compose-2496ED?style=flat-square&logo=docker)
![License](https://img.shields.io/badge/license-MIT-39ff14?style=flat-square)

---

## ✨ Features

- **Trading Bots** — Create bots with virtual balance, each with its own API token
- **Live Market Data** — Real-time prices and candlestick charts (BTC, ETH, SOL and more)
- **Trading Engine** — Buy / Sell with leverage up to 40x, stop-loss and take-profit orders
- **Portfolio Dashboard** — Live balance chart showing each bot's progress over time
- **Bot Examples** — Ready-to-run RSI and EMA Crossover bots included
- **Cyber UI** — Dark neon aesthetic built with React + Tailwind + lightweight-charts

---

## 🛠 Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, lightweight-charts |
| Backend | Node.js, Express, better-sqlite3, JWT |
| Proxy | Nginx (SSL termination + SPA routing) |
| Deploy | Docker Compose |

---

## 🚀 Quick Start

### Prerequisites

- Docker + Docker Compose
- (Optional) Node.js 18+ to run bot examples locally

### 1. Clone

```bash
git clone https://github.com/anni-chesm/crypto-playground.git
cd crypto-playground
```

### 2. SSL Certificates

The stack uses HTTPS. For local development, generate a self-signed certificate:

```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/CN=localhost"
```

### 3. Start

```bash
docker compose up -d --build
```

The app will be available at **https://localhost:8001** (or your server IP).

### 4. Register & Create a Bot

1. Open `https://localhost:8001`
2. Register an account
3. Go to **Dashboard** → click **New Bot**
4. Copy the generated **API Token**

---

## 🤖 Running a Trading Bot

Two example bots are included in `bot-examples/`. They require no npm packages — just Node.js.

```bash
# RSI Mean Reversion (BTC, 1h)
API_TOKEN=your-token node bot-examples/bot1-rsi-reversion.js

# EMA Crossover (ETH, 15m)
API_TOKEN=your-token node bot-examples/bot2-ema-crossover.js
```

Both support `DRY_RUN=true` for simulation without placing orders.

See [`bot-examples/README.md`](bot-examples/README.md) for full configuration options.

---

## 📡 API Reference

All trading endpoints require the `X-API-Token` header (bot token).  
All user endpoints require `Authorization: Bearer <jwt>`.

### Market Data (public)

```
GET  /api/crypto/list                          — top 50 coins
GET  /api/crypto/:symbol/price                 — current price
GET  /api/crypto/:symbol/candles?interval=1h   — OHLCV candles
```

### Auth

```
POST /api/auth/register   { username, email, password }
POST /api/auth/login      { email, password }
```

### Bots (JWT)

```
GET    /api/bots             — list your bots
POST   /api/bots             — create bot  { name, initial_balance }
GET    /api/bots/:id         — bot details
DELETE /api/bots/:id         — delete bot
GET    /api/bots/chart-data  — portfolio balance history (query: ?hours=3-6)
```

### Trading (API Token)

```
POST /api/trading/buy          { symbol, quantity, leverage }
POST /api/trading/sell         { symbol, quantity }
POST /api/trading/stop-loss    { symbol, quantity, stop_price }
POST /api/trading/take-profit  { symbol, quantity, target_price }
GET  /api/trading/orders
GET  /api/trading/positions
DELETE /api/trading/orders/:id
```

---

## 📁 Project Structure

```
crypto-playground/
├── backend/
│   ├── src/
│   │   ├── db/          # SQLite schema + migrations
│   │   ├── middleware/  # JWT + API token auth
│   │   ├── routes/      # bots, trading, crypto, auth
│   │   └── services/    # CoinGecko API wrapper
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/  # CandleChart, BotCard, PortfolioChart...
│   │   ├── pages/       # Dashboard, Crypto, BotDetail, Login...
│   │   ├── store/       # Zustand auth store
│   │   └── api/         # Axios client
│   └── Dockerfile
├── nginx/
│   ├── nginx.conf       # HTTPS + reverse proxy
│   └── ssl/             # Certificates (not committed)
├── bot-examples/        # Ready-to-run RSI + EMA bots
└── docker-compose.yml
```

---

## 📊 Dashboard

The dashboard shows:
- All your bots with current balance, P&L and open positions
- **Portfolio Evolution chart** — one line per bot, 10-min intervals, 3–6h range
- Buy/sell markers on the chart at the exact moment each trade was executed

---

## ⚙️ Configuration

Environment variables for the backend (set in `docker-compose.yml`):

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `production` | Environment |
| `PORT` | `3000` | Backend port |
| `JWT_SECRET` | *(change this!)* | JWT signing secret |

---

## 🔒 Notes

- All balances are **virtual** — no real money, no real trades
- Market data is fetched from the CoinGecko public API
- SQLite database is persisted in a Docker volume (`backend-data`)
- Leverage is capped at 40x; liquidation occurs when PnL ≤ -margin

---

## 📄 License

MIT — do whatever you want with it.
