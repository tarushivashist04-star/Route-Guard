const express = require('express');
const db = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');
const { getPointsHistory } = require('../services/pointsService');
const { getDashboardStats } = require('./issues');
const router = express.Router();

router.get('/stats', authenticate, requireManager, (req, res) => {
  try {
    const stats = getDashboardStats();
    const recentIssues = db.prepare('SELECT i.*,d.name as driver_name,d.vehicle_number FROM issues i LEFT JOIN drivers d ON i.driver_id=d.driver_id WHERE i.status=\'active\' ORDER BY i.created_at DESC LIMIT 5').all();
    const topDrivers = db.prepare('SELECT driver_id,name,vehicle_number,points,trust_score,status,current_route FROM drivers ORDER BY points DESC LIMIT 5').all();
    const recentAlerts = db.prepare('SELECT a.*,i.issue_type,i.area_name FROM alerts a JOIN issues i ON a.issue_id=i.id ORDER BY a.created_at DESC LIMIT 10').all();
    const riskBreakdown = db.prepare("SELECT risk_level, COUNT(*) as count FROM route_history WHERE status='active' GROUP BY risk_level").all();
    res.json({ stats, recentIssues, topDrivers, recentAlerts, riskBreakdown });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/driver/:driverId/points', authenticate, requireManager, (req, res) => {
  const h = getPointsHistory(req.params.driverId);
  const d = db.prepare('SELECT points,trust_score FROM drivers WHERE driver_id=?').get(req.params.driverId);
  res.json({ history: h, current: d });
});

router.get('/me', authenticate, (req, res) => {
  if (req.user.role !== 'driver') return res.status(403).json({ error: 'Drivers only' });
  const driver = db.prepare('SELECT driver_id,name,email,vehicle_number,phone,status,current_route,points,trust_score,created_at FROM drivers WHERE driver_id=?').get(req.user.driver_id);
  if (!driver) return res.status(404).json({ error: 'Not found' });
  const history = getPointsHistory(req.user.driver_id);
  const myIssues = db.prepare('SELECT * FROM issues WHERE driver_id=? ORDER BY created_at DESC LIMIT 10').all(req.user.driver_id);
  const unreadAlerts = db.prepare('SELECT COUNT(*) as count FROM alerts WHERE target_driver_id=? AND seen=0').get(req.user.driver_id).count;
  res.json({ driver, pointsHistory: history, myIssues, unreadAlerts });
});

module.exports = router;
