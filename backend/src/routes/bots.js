const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// GET /api/bots - list user's bots
router.get('/', authenticateJWT, (req, res) => {
  try {
    const bots = db.prepare(`
      SELECT b.*,
        (SELECT COUNT(*) FROM orders WHERE bot_id = b.id AND status = 'open') as open_orders,
        (SELECT COUNT(*) FROM positions WHERE bot_id = b.id AND quantity > 0) as active_positions
      FROM bots b WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `).all(req.user.id);

    // Calculate P&L for each bot
    const botsWithPnl = bots.map(bot => ({
      ...bot,
      pnl: bot.current_balance - bot.initial_balance,
      pnl_pct: ((bot.current_balance - bot.initial_balance) / bot.initial_balance * 100).toFixed(2)
    }));

    res.json(botsWithPnl);
  } catch (err) {
    console.error('List bots error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/bots - create a bot
router.post('/', authenticateJWT, (req, res) => {
  try {
    const { name, initial_balance = 1000 } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Bot name is required' });
    }

    const apiToken = uuidv4();
    const result = db.prepare(
      'INSERT INTO bots (user_id, name, api_token, initial_balance, current_balance) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, name, apiToken, initial_balance, initial_balance);

    const bot = db.prepare('SELECT * FROM bots WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(bot);
  } catch (err) {
    console.error('Create bot error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/bots/chart-data - portfolio balance history for all user bots
router.get('/chart-data', authenticateJWT, (req, res) => {
  try {
    const hours = Math.min(6, Math.max(3, parseInt(req.query.hours) || 6));
    const nowMs = Date.now();
    const fromMs = nowMs - hours * 60 * 60 * 1000;
    const fromUnix = Math.floor(fromMs / 1000);

    const bots = db.prepare('SELECT * FROM bots WHERE user_id = ? ORDER BY created_at ASC').all(req.user.id);

    const bucketSec = 600; // 10 minutes
    const colors = ['#00f5ff', '#ff006e', '#39ff14', '#bf5af2', '#ff9f0a', '#ffd60a', '#30d158'];

    const chartBots = bots.map((bot, idx) => {
      const botCreatedMs = new Date(bot.created_at + 'Z').getTime();
      const startMs = Math.max(fromMs, botCreatedMs);

      // Build 10-min buckets from startMs to nowMs
      const buckets = [];
      for (let t = startMs; t <= nowMs; t += bucketSec * 1000) {
        buckets.push(t);
      }
      if (buckets.length === 0 || buckets[buckets.length - 1] < nowMs) {
        buckets.push(nowMs);
      }

      // Get balance log entries for this bot within range
      const logs = db.prepare(`
        SELECT balance, CAST(strftime('%s', recorded_at) AS INTEGER) AS ts_unix
        FROM bot_balance_log
        WHERE bot_id = ? AND CAST(strftime('%s', recorded_at) AS INTEGER) >= ?
        ORDER BY recorded_at ASC
      `).all(bot.id, fromUnix);

      // Build series: walk through buckets, applying logs
      let lastBalance = bot.initial_balance;
      let logIdx = 0;
      const series = [];

      for (const bucketMs of buckets) {
        const bucketUnix = Math.floor(bucketMs / 1000);
        while (logIdx < logs.length && logs[logIdx].ts_unix <= bucketUnix) {
          lastBalance = logs[logIdx].balance;
          logIdx++;
        }
        series.push({ time: bucketUnix, value: parseFloat(lastBalance.toFixed(2)) });
      }

      // Last point always = actual current balance
      if (series.length > 0) {
        series[series.length - 1].value = parseFloat(bot.current_balance.toFixed(2));
      }

      // Get order markers (filled buy/sell within range)
      const orders = db.prepare(`
        SELECT type, symbol, price, quantity, status,
               CAST(strftime('%s', COALESCE(filled_at, created_at)) AS INTEGER) AS ts_unix
        FROM orders
        WHERE bot_id = ?
          AND status IN ('filled', 'liquidated')
          AND CAST(strftime('%s', COALESCE(filled_at, created_at)) AS INTEGER) >= ?
        ORDER BY COALESCE(filled_at, created_at) ASC
      `).all(bot.id, fromUnix);

      const markers = orders.map(o => ({
        time: Math.floor(o.ts_unix / bucketSec) * bucketSec, // snap to 10-min bucket
        type: o.type,
        symbol: o.symbol,
        price: o.price,
        quantity: o.quantity,
        status: o.status
      }));

      return {
        id: bot.id,
        name: bot.name,
        color: colors[idx % colors.length],
        currentBalance: parseFloat(bot.current_balance.toFixed(2)),
        series,
        markers
      };
    });

    res.json({
      from: Math.floor(fromMs / 1000),
      to: Math.floor(nowMs / 1000),
      bucketSeconds: bucketSec,
      bots: chartBots
    });
  } catch (err) {
    console.error('Chart data error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/bots/:id - get a specific bot
router.get('/:id', authenticateJWT, (req, res) => {
  try {
    const bot = db.prepare('SELECT * FROM bots WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);

    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    res.json({
      ...bot,
      pnl: bot.current_balance - bot.initial_balance,
      pnl_pct: ((bot.current_balance - bot.initial_balance) / bot.initial_balance * 100).toFixed(2)
    });
  } catch (err) {
    console.error('Get bot error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/bots/:id - delete a bot
router.delete('/:id', authenticateJWT, (req, res) => {
  try {
    const bot = db.prepare('SELECT id FROM bots WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);

    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    // Clean up related data
    db.prepare('DELETE FROM orders WHERE bot_id = ?').run(bot.id);
    db.prepare('DELETE FROM positions WHERE bot_id = ?').run(bot.id);
    db.prepare('DELETE FROM bots WHERE id = ?').run(bot.id);

    res.json({ message: 'Bot deleted successfully' });
  } catch (err) {
    console.error('Delete bot error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
