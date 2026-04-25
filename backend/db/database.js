const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new sqlite3.Database(path.join(dbDir, 'routeguard.db'), (err) => {
  if (err) {
    console.error('DB Error:', err);
  } else {
    console.log('Connected to SQLite');
  }
});

db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS managers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      driver_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      vehicle_number TEXT NOT NULL,
      phone TEXT,
      license_number TEXT,
      status TEXT DEFAULT 'offline',
      current_route TEXT,
      current_lat REAL,
      current_lng REAL,
      points INTEGER DEFAULT 0,
      trust_score REAL DEFAULT 5.0,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES managers(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY,
      driver_id TEXT NOT NULL,
      issue_type TEXT NOT NULL,
      description TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      area_name TEXT,
      status TEXT DEFAULT 'active',
      verified_count INTEGER DEFAULT 0,
      false_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY (driver_id) REFERENCES drivers(driver_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS route_history (
      id TEXT PRIMARY KEY,
      driver_id TEXT NOT NULL,
      route_name TEXT NOT NULL,
      start_point TEXT,
      end_point TEXT,
      distance_km REAL,
      status TEXT DEFAULT 'active',
      risk_level TEXT DEFAULT 'low',
      risk_reasons TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      FOREIGN KEY (driver_id) REFERENCES drivers(driver_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      issue_id TEXT NOT NULL,
      target_driver_id TEXT NOT NULL,
      distance_km REAL,
      action_suggested TEXT,
      seen INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (issue_id) REFERENCES issues(id),
      FOREIGN KEY (target_driver_id) REFERENCES drivers(driver_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS point_transactions (
      id TEXT PRIMARY KEY,
      driver_id TEXT NOT NULL,
      points_change INTEGER NOT NULL,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (driver_id) REFERENCES drivers(driver_id)
    )
  `, () => {
    console.log('✅ Database initialized');
  });
});

module.exports = db;
