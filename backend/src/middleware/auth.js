const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'crypto-playground-secret-2024';

// JWT auth middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// API Token auth middleware (for bots)
const authenticateApiToken = (req, res, next) => {
  const apiToken = req.headers['x-api-token'];
  if (!apiToken) {
    return res.status(401).json({ error: 'X-API-Token header required' });
  }

  const bot = db.prepare('SELECT * FROM bots WHERE api_token = ?').get(apiToken);
  if (!bot) {
    return res.status(401).json({ error: 'Invalid API token' });
  }

  req.bot = bot;
  next();
};

module.exports = { authenticateJWT, authenticateApiToken, JWT_SECRET };
