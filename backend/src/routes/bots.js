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
