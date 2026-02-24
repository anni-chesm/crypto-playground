const express = require('express');
const db = require('../db/database');
const { authenticateApiToken } = require('../middleware/auth');
const { getCoinPrice } = require('../services/cryptoApi');

const router = express.Router();

// POST /api/trading/buy
router.post('/buy', authenticateApiToken, async (req, res) => {
  try {
    const { symbol, quantity } = req.body;
    const bot = req.bot;

    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Symbol and positive quantity are required' });
    }

    // Get current price
    const priceData = await getCoinPrice(symbol);
    const price = priceData.price;
    const totalCost = price * quantity;

    // Check balance
    if (bot.current_balance < totalCost) {
      return res.status(400).json({
        error: `Insufficient balance. Need $${totalCost.toFixed(2)}, have $${bot.current_balance.toFixed(2)}`
      });
    }

    // Create order and update balance in a transaction
    const transaction = db.transaction(() => {
      const order = db.prepare(
        'INSERT INTO orders (bot_id, type, symbol, quantity, price, status, filled_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
      ).run(bot.id, 'buy', symbol.toUpperCase(), quantity, price, 'filled');

      // Deduct balance
      db.prepare('UPDATE bots SET current_balance = current_balance - ? WHERE id = ?')
        .run(totalCost, bot.id);

      // Update or create position
      const existing = db.prepare('SELECT * FROM positions WHERE bot_id = ? AND symbol = ?')
        .get(bot.id, symbol.toUpperCase());

      if (existing) {
        const newQty = existing.quantity + quantity;
        const newAvg = (existing.avg_entry_price * existing.quantity + price * quantity) / newQty;
        db.prepare('UPDATE positions SET quantity = ?, avg_entry_price = ? WHERE id = ?')
          .run(newQty, newAvg, existing.id);
      } else {
        db.prepare('INSERT INTO positions (bot_id, symbol, quantity, avg_entry_price) VALUES (?, ?, ?, ?)')
          .run(bot.id, symbol.toUpperCase(), quantity, price);
      }

      return order.lastInsertRowid;
    });

    const orderId = transaction();
    const updatedBot = db.prepare('SELECT current_balance FROM bots WHERE id = ?').get(bot.id);

    res.json({
      success: true,
      order_id: orderId,
      symbol: symbol.toUpperCase(),
      quantity,
      price,
      total_cost: totalCost,
      new_balance: updatedBot.current_balance
    });
  } catch (err) {
    console.error('Buy error:', err);
    res.status(500).json({ error: err.message || 'Trade failed' });
  }
});

// POST /api/trading/sell
router.post('/sell', authenticateApiToken, async (req, res) => {
  try {
    const { symbol, quantity } = req.body;
    const bot = req.bot;

    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Symbol and positive quantity are required' });
    }

    // Check position
    const position = db.prepare('SELECT * FROM positions WHERE bot_id = ? AND symbol = ?')
      .get(bot.id, symbol.toUpperCase());

    if (!position || position.quantity < quantity) {
      return res.status(400).json({
        error: `Insufficient position. Have ${position?.quantity || 0} ${symbol}, trying to sell ${quantity}`
      });
    }

    // Get current price
    const priceData = await getCoinPrice(symbol);
    const price = priceData.price;
    const totalProceeds = price * quantity;

    const transaction = db.transaction(() => {
      db.prepare(
        'INSERT INTO orders (bot_id, type, symbol, quantity, price, status, filled_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
      ).run(bot.id, 'sell', symbol.toUpperCase(), quantity, price, 'filled');

      // Add proceeds to balance
      db.prepare('UPDATE bots SET current_balance = current_balance + ? WHERE id = ?')
        .run(totalProceeds, bot.id);

      // Update position
      const newQty = position.quantity - quantity;
      if (newQty <= 0) {
        db.prepare('DELETE FROM positions WHERE id = ?').run(position.id);
      } else {
        db.prepare('UPDATE positions SET quantity = ? WHERE id = ?').run(newQty, position.id);
      }
    });

    transaction();
    const updatedBot = db.prepare('SELECT current_balance FROM bots WHERE id = ?').get(bot.id);
    const pnl = (price - position.avg_entry_price) * quantity;

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      quantity,
      price,
      total_proceeds: totalProceeds,
      pnl,
      new_balance: updatedBot.current_balance
    });
  } catch (err) {
    console.error('Sell error:', err);
    res.status(500).json({ error: err.message || 'Trade failed' });
  }
});

// POST /api/trading/stop-loss
router.post('/stop-loss', authenticateApiToken, async (req, res) => {
  try {
    const { symbol, quantity, stop_price } = req.body;
    const bot = req.bot;

    if (!symbol || !quantity || !stop_price) {
      return res.status(400).json({ error: 'Symbol, quantity and stop_price are required' });
    }

    const order = db.prepare(
      'INSERT INTO orders (bot_id, type, symbol, quantity, price, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(bot.id, 'stop-loss', symbol.toUpperCase(), quantity, stop_price, 'open');

    res.json({
      success: true,
      order_id: order.lastInsertRowid,
      type: 'stop-loss',
      symbol: symbol.toUpperCase(),
      quantity,
      stop_price,
      status: 'open'
    });
  } catch (err) {
    console.error('Stop-loss error:', err);
    res.status(500).json({ error: err.message || 'Order failed' });
  }
});

// POST /api/trading/take-profit
router.post('/take-profit', authenticateApiToken, async (req, res) => {
  try {
    const { symbol, quantity, target_price } = req.body;
    const bot = req.bot;

    if (!symbol || !quantity || !target_price) {
      return res.status(400).json({ error: 'Symbol, quantity and target_price are required' });
    }

    const order = db.prepare(
      'INSERT INTO orders (bot_id, type, symbol, quantity, price, status) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(bot.id, 'take-profit', symbol.toUpperCase(), quantity, target_price, 'open');

    res.json({
      success: true,
      order_id: order.lastInsertRowid,
      type: 'take-profit',
      symbol: symbol.toUpperCase(),
      quantity,
      target_price,
      status: 'open'
    });
  } catch (err) {
    console.error('Take-profit error:', err);
    res.status(500).json({ error: err.message || 'Order failed' });
  }
});

// GET /api/trading/orders
router.get('/orders', authenticateApiToken, (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders WHERE bot_id = ? ORDER BY created_at DESC LIMIT 100')
      .all(req.bot.id);
    res.json(orders);
  } catch (err) {
    console.error('Orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/trading/positions
router.get('/positions', authenticateApiToken, (req, res) => {
  try {
    const positions = db.prepare('SELECT * FROM positions WHERE bot_id = ? AND quantity > 0 ORDER BY created_at DESC')
      .all(req.bot.id);
    res.json(positions);
  } catch (err) {
    console.error('Positions error:', err);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

// DELETE /api/trading/orders/:id
router.delete('/orders/:id', authenticateApiToken, (req, res) => {
  try {
    const order = db.prepare("SELECT * FROM orders WHERE id = ? AND bot_id = ? AND status = 'open'")
      .get(req.params.id, req.bot.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found or not cancellable' });
    }

    db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(order.id);
    res.json({ message: 'Order cancelled', order_id: order.id });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

module.exports = router;
