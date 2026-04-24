const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'routeguard_ai_secret';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    next();
  } catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}

function requireManager(req, res, next) {
  if (!req.user || req.user.role !== 'manager') return res.status(403).json({ error: 'Managers only' });
  next();
}

function requireDriver(req, res, next) {
  if (!req.user || req.user.role !== 'driver') return res.status(403).json({ error: 'Drivers only' });
  next();
}

module.exports = { authenticate, requireManager, requireDriver };
