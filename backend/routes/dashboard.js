const express = require('express');
const db = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');
const { getPointsHistory } = require('../services/pointsService');
const { getDashboardStats } = require('./issues');
const router = express.Router();

router.get('/stats', authenticate, requireManager, (req, res) => {
  getDashboardStats((stats) => {
    db.all(
      "SELECT i.*,d.name as driver_name,d.vehicle_number FROM issues i LEFT JOIN drivers d ON i.driver_id=d.driver_id WHERE i.status='active' ORDER BY i.created_at DESC LIMIT 5",
      [],
      (err, recentIssues) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        db.all('SELECT driver_id,name,vehicle_number,points,trust_score,status,current_route FROM drivers ORDER BY points DESC LIMIT 5', [], (err2, topDrivers) => {
          if (err2) return res.status(500).json({ error: 'Server error' });
          db.all('SELECT a.*,i.issue_type,i.area_name FROM alerts a JOIN issues i ON a.issue_id=i.id ORDER BY a.created_at DESC LIMIT 10', [], (err3, recentAlerts) => {
            if (err3) return res.status(500).json({ error: 'Server error' });
            db.all("SELECT risk_level, COUNT(*) as count FROM route_history WHERE status='active' GROUP BY risk_level", [], (err4, riskBreakdown) => {
              if (err4) return res.status(500).json({ error: 'Server error' });
              res.json({ stats, recentIssues, topDrivers, recentAlerts, riskBreakdown });
            });
          });
        });
      }
    );
  });
});

router.get('/driver/:driverId/points', authenticate, requireManager, (req, res) => {
  getPointsHistory(req.params.driverId, (h) => {
    db.get('SELECT points,trust_score FROM drivers WHERE driver_id=?', [req.params.driverId], (err, d) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      res.json({ history: h, current: d });
    });
  });
});

router.get('/me', authenticate, (req, res) => {
  if (req.user.role !== 'driver') return res.status(403).json({ error: 'Drivers only' });
  db.get(
    'SELECT driver_id,name,email,vehicle_number,phone,status,current_route,points,trust_score,created_at FROM drivers WHERE driver_id=?',
    [req.user.driver_id],
    (err, driver) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      if (!driver) return res.status(404).json({ error: 'Not found' });
      getPointsHistory(req.user.driver_id, (history) => {
        db.all('SELECT * FROM issues WHERE driver_id=? ORDER BY created_at DESC LIMIT 10', [req.user.driver_id], (err2, myIssues) => {
          if (err2) return res.status(500).json({ error: 'Server error' });
          db.get('SELECT COUNT(*) as count FROM alerts WHERE target_driver_id=? AND seen=0', [req.user.driver_id], (err3, alertRow) => {
            if (err3) return res.status(500).json({ error: 'Server error' });
            res.json({ driver, pointsHistory: history, myIssues, unreadAlerts: alertRow ? alertRow.count : 0 });
          });
        });
      });
    }
  );
});

module.exports = router;
