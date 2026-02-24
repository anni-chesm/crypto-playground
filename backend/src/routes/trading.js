const express = require('express');
const db = require('../db/database');
const { authenticateApiToken } = require('../middleware/auth');
const { getCoinPrice } = require('../services/cryptoApi');

const router = express.Router();

const MAX_LEVERAGE = 40;
const MIN_LEVERAGE = 1;

function clampLeverage(val) {
  const l = parseInt(val) || 1;
  return Math.min(Math.max(l, MIN_LEVERAGE), MAX_LEVERAGE);
}

// POST /api/trading/buy
router.post('/buy', authenticateApiToken, async (req, res) => {
  try {
    const { symbol, quantity, leverage: rawLeverage } = req.body;
    const bot = req.bot;
    const leverage = clampLeverage(rawLeverage);

    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Symbol and positive quantity are required' });
    }

    const priceData = await getCoinPrice(symbol);
    const price = priceData.price;
    const notional = price * quantity;
    const margin = notional / leverage;

    if (bot.current_balance < margin) {
      return res.status(400).json({
        error: `Insufficient balance. Need $${margin.toFixed(2)} margin (x${leverage} leverage on $${notional.toFixed(2)} notional), have $${bot.current_balance.toFixed(2)}`
      });
    }

    const transaction = db.transaction(() => {
      const order = db.prepare(
        'INSERT INTO orders (bot_id, type, symbol, quantity, price, leverage, margin, status, filled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
      ).run(bot.id, 'buy', symbol.toUpperCase(), quantity, price, leverage, margin, 'filled');

      db.prepare('UPDATE bots SET current_balance = current_balance - ? WHERE id = ?')
        .run(margin, bot.id);

      const existing = db.prepare('SELECT * FROM positions WHERE bot_id = ? AND symbol = ?')
        .get(bot.id, symbol.toUpperCase());

      if (existing) {
        const newQty = existing.quantity + quantity;
        const newAvg = (existing.avg_entry_price * existing.quantity + price * quantity) / newQty;
        const newMargin = (existing.margin || 0) + margin;
        const newLeverage = Math.round(((existing.leverage || 1) * existing.quantity + leverage * quantity) / newQty);
        db.prepare('UPDATE positions SET quantity = ?, avg_entry_price = ?, leverage = ?, margin = ? WHERE id = ?')
          .run(newQty, newAvg, newLeverage, newMargin, existing.id);
      } else {
        db.prepare('INSERT INTO positions (bot_id, symbol, quantity, avg_entry_price, leverage, margin) VALUES (?, ?, ?, ?, ?, ?)')
          .run(bot.id, symbol.toUpperCase(), quantity, price, leverage, margin);
      }

      return order.lastInsertRowid;
    });

    const orderId = transaction();
    const updatedBot = db.prepare('SELECT current_balance FROM bots WHERE id = ?').get(bot.id);
    db.prepare('INSERT INTO bot_balance_log (bot_id, balance) VALUES (?, ?)').run(bot.id, updatedBot.current_balance);

    res.status(201).json({
      success: true,
      order_id: orderId,
      symbol: symbol.toUpperCase(),
      quantity,
      price,
      leverage,
      notional,
      margin_used: margin,
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

    const position = db.prepare('SELECT * FROM positions WHERE bot_id = ? AND symbol = ?')
      .get(bot.id, symbol.toUpperCase());

    if (!position || position.quantity < quantity) {
      return res.status(400).json({
        error: `Insufficient position. Have ${position?.quantity || 0} ${symbol}, trying to sell ${quantity}`
      });
    }

    const priceData = await getCoinPrice(symbol);
    const price = priceData.price;

    const leverage = position.leverage || 1;
    const entryPrice = position.avg_entry_price;
    // Fraction of position being sold
    const fraction = quantity / position.quantity;
    const marginUsed = (position.margin || (entryPrice * quantity / leverage)) * fraction;

    // P&L = price difference × quantity (leverage is already "in" via reduced margin)
    const pnl = (price - entryPrice) * quantity;
    const isLiquidated = pnl <= -marginUsed;
    const payout = isLiquidated ? 0 : marginUsed + pnl;

    const transaction = db.transaction(() => {
      const status = isLiquidated ? 'liquidated' : 'filled';
      db.prepare(
        'INSERT INTO orders (bot_id, type, symbol, quantity, price, leverage, margin, status, filled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
      ).run(bot.id, 'sell', symbol.toUpperCase(), quantity, price, leverage, marginUsed, status);

      if (payout > 0) {
        db.prepare('UPDATE bots SET current_balance = current_balance + ? WHERE id = ?')
          .run(payout, bot.id);
      }

      const newQty = position.quantity - quantity;
      if (newQty <= 0.000001) {
        db.prepare('DELETE FROM positions WHERE id = ?').run(position.id);
      } else {
        const newMargin = (position.margin || 0) * (1 - fraction);
        db.prepare('UPDATE positions SET quantity = ?, margin = ? WHERE id = ?')
          .run(newQty, newMargin, position.id);
      }
    });

    transaction();
    const updatedBot = db.prepare('SELECT current_balance FROM bots WHERE id = ?').get(bot.id);
    db.prepare('INSERT INTO bot_balance_log (bot_id, balance) VALUES (?, ?)').run(bot.id, updatedBot.current_balance);

    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      quantity,
      entry_price: entryPrice,
      exit_price: price,
      leverage,
      margin_returned: marginUsed,
      pnl: pnl.toFixed(4),
      leveraged_roi_pct: ((pnl / marginUsed) * 100).toFixed(2),
      liquidated: isLiquidated,
      payout: payout.toFixed(4),
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
    const { symbol, quantity, stop_price, leverage: rawLeverage } = req.body;
    const bot = req.bot;
    const leverage = clampLeverage(rawLeverage);

    if (!symbol || !quantity || !stop_price) {
      return res.status(400).json({ error: 'Symbol, quantity and stop_price are required' });
    }

    const order = db.prepare(
      'INSERT INTO orders (bot_id, type, symbol, quantity, price, leverage, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(bot.id, 'stop-loss', symbol.toUpperCase(), quantity, stop_price, leverage, 'open');

    res.status(201).json({
      success: true,
      order_id: order.lastInsertRowid,
      type: 'stop-loss',
      symbol: symbol.toUpperCase(),
      quantity,
      stop_price,
      leverage,
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
    const { symbol, quantity, target_price, leverage: rawLeverage } = req.body;
    const bot = req.bot;
    const leverage = clampLeverage(rawLeverage);

    if (!symbol || !quantity || !target_price) {
      return res.status(400).json({ error: 'Symbol, quantity and target_price are required' });
    }

    const order = db.prepare(
      'INSERT INTO orders (bot_id, type, symbol, quantity, price, leverage, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(bot.id, 'take-profit', symbol.toUpperCase(), quantity, target_price, leverage, 'open');

    res.status(201).json({
      success: true,
      order_id: order.lastInsertRowid,
      type: 'take-profit',
      symbol: symbol.toUpperCase(),
      quantity,
      target_price,
      leverage,
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
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

module.exports = router;
