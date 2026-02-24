const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.join(dbDir, 'crypto.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    api_token TEXT UNIQUE NOT NULL,
    initial_balance REAL DEFAULT 1000,
    current_balance REAL DEFAULT 1000,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('buy', 'sell', 'stop-loss', 'take-profit')),
    symbol TEXT NOT NULL,
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    leverage INTEGER DEFAULT 1,
    margin REAL,
    status TEXT DEFAULT 'open' CHECK(status IN ('open', 'filled', 'cancelled', 'liquidated')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    filled_at DATETIME,
    FOREIGN KEY (bot_id) REFERENCES bots(id)
  );

  CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    avg_entry_price REAL NOT NULL DEFAULT 0,
    leverage INTEGER DEFAULT 1,
    margin REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES bots(id)
  );
`);

// Migrations — add new columns if they don't exist
const migrate = () => {
  const migrations = [
    `ALTER TABLE orders ADD COLUMN leverage INTEGER DEFAULT 1`,
    `ALTER TABLE orders ADD COLUMN margin REAL`,
    `ALTER TABLE positions ADD COLUMN leverage INTEGER DEFAULT 1`,
    `ALTER TABLE positions ADD COLUMN margin REAL DEFAULT 0`,
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch (_) { /* column already exists */ }
  }
};
migrate();

console.log('Database initialized');

module.exports = db;
