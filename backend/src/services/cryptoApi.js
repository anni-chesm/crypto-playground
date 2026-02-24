const fetch = require('node-fetch');

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const BINANCE_BASE = 'https://api.binance.com/api/v3';

// Cache to avoid rate limiting
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.time < CACHE_TTL) {
    return entry.data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, time: Date.now() });
}

// Get top 50 coins from CoinGecko
async function getTopCoins(page = 1, perPage = 50) {
  const cacheKey = `coins_${page}_${perPage}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false&price_change_percentage=24h`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });

  if (!res.ok) {
    throw new Error(`CoinGecko API error: ${res.status}`);
  }

  const data = await res.json();
  setCache(cacheKey, data);
  return data;
}

// Get current price for a symbol
async function getCoinPrice(symbol) {
  const cacheKey = `price_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // Try Binance first
  try {
    const url = `${BINANCE_BASE}/ticker/price?symbol=${symbol.toUpperCase()}USDT`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const result = { symbol: symbol.toUpperCase(), price: parseFloat(data.price), source: 'binance' };
      setCache(cacheKey, result);
      return result;
    }
  } catch (e) {
    // fallback to coingecko
  }

  // Fallback: CoinGecko
  const url = `${COINGECKO_BASE}/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Price API error: ${res.status}`);

  const data = await res.json();
  const price = data[symbol.toLowerCase()]?.usd;
  if (!price) throw new Error(`Price not found for ${symbol}`);

  const result = { symbol: symbol.toUpperCase(), price, source: 'coingecko' };
  setCache(cacheKey, result);
  return result;
}

// Get OHLCV candles from Binance
async function getCandles(symbol, interval = '1d', limit = 100) {
  const cacheKey = `candles_${symbol}_${interval}_${limit}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // Map CoinGecko symbol to Binance pair
  const binanceSymbol = symbol.toUpperCase().replace('-', '') + 'USDT';

  const url = `${BINANCE_BASE}/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Binance API error: ${res.status} for ${binanceSymbol}`);
  }

  const raw = await res.json();

  // Convert to lightweight-charts format: {time, open, high, low, close, volume}
  const candles = raw.map(k => ({
    time: Math.floor(k[0] / 1000),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5])
  }));

  setCache(cacheKey, candles);
  return candles;
}

module.exports = { getTopCoins, getCoinPrice, getCandles };
