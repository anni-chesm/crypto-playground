const express = require('express');
const { getTopCoins, getCoinPrice, getCandles } = require('../services/cryptoApi');

const router = express.Router();

// GET /api/crypto/list - get top 50 coins
router.get('/list', async (req, res) => {
  try {
    const coins = await getTopCoins(1, 50);
    res.json(coins);
  } catch (err) {
    console.error('Crypto list error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch crypto list' });
  }
});

// GET /api/crypto/:symbol/price - get current price
router.get('/:symbol/price', async (req, res) => {
  try {
    const { symbol } = req.params;
    const price = await getCoinPrice(symbol);
    res.json(price);
  } catch (err) {
    console.error('Price error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch price' });
  }
});

// GET /api/crypto/:symbol/candles?interval=1d&limit=100
router.get('/:symbol/candles', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1d', limit = 100 } = req.query;

    // Validate interval
    const validIntervals = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
    if (!validIntervals.includes(interval)) {
      return res.status(400).json({ error: `Invalid interval. Use: ${validIntervals.join(', ')}` });
    }

    const candles = await getCandles(symbol, interval, Math.min(parseInt(limit) || 100, 500));
    res.json(candles);
  } catch (err) {
    console.error('Candles error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch candles' });
  }
});

module.exports = router;
