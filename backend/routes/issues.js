const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, requireDriver } = require('../middleware/auth');
const { onReportSubmitted, onReportVerified, onReportMarkedFalse } = require('../services/pointsService');
const { haversineDistance, getApproximateAreaName, getApproximateDistance } = require('../services/geoUtils');
const { getSuggestedAction } = require('../services/riskAnalysis');
const router = express.Router();
let io = null;
router.setIo = (i) => { io = i; };

function getDashboardStats(callback) {
  const stats = {};
  db.get('SELECT COUNT(*) as c FROM drivers', [], (err, r) => {
    stats.totalDrivers = r ? r.c : 0;
    db.get("SELECT COUNT(*) as c FROM drivers WHERE status='active'", [], (err, r) => {
      stats.activeDrivers = r ? r.c : 0;
      db.get("SELECT COUNT(*) as c FROM issues WHERE status='active'", [], (err, r) => {
        stats.activeIssues = r ? r.c : 0;
        db.get("SELECT COUNT(*) as c FROM route_history WHERE status='active'", [], (err, r) => {
          stats.activeRoutes = r ? r.c : 0;
          db.get('SELECT COUNT(*) as c FROM alerts WHERE seen=0', [], (err, r) => {
            stats.unresolvedAlerts = r ? r.c : 0;
            db.get("SELECT COUNT(DISTINCT route_name) as c FROM route_history WHERE risk_level='high' AND status='active'", [], (err, r) => {
              stats.highRiskRoutes = r ? r.c : 0;
              callback(stats);
            });
          });
        });
      });
    });
  });
}

router.post('/', authenticate, requireDriver, (req, res) => {
  try {
    const { issue_type, description, lat, lng } = req.body;
    if (!issue_type || lat == null || lng == null) return res.status(400).json({ error: 'issue_type, lat, lng required' });
    const valid = ['accident', 'traffic', 'fog', 'roadblock', 'flood', 'construction', 'pothole', 'other'];
    if (!valid.includes(issue_type)) return res.status(400).json({ error: 'Invalid issue type' });

    const id = uuidv4();
    const driver_id = req.user.driver_id;
    const area_name = getApproximateAreaName(lat, lng);

    db.run(
      'INSERT INTO issues (id,driver_id,issue_type,description,lat,lng,area_name) VALUES (?,?,?,?,?,?,?)',
      [id, driver_id, issue_type, description || '', lat, lng, area_name],
      (err) => {
        if (err) { console.error(err); return res.status(500).json({ error: 'Server error' }); }

        const action = getSuggestedAction(issue_type);
        onReportSubmitted(driver_id, (pts) => {
          const nearbySQL = "SELECT driver_id,current_lat,current_lng FROM drivers WHERE status='active' AND driver_id!=? AND current_lat IS NOT NULL AND current_lng IS NOT NULL";
          db.all(nearbySQL, [driver_id], (err2, nearby) => {
            if (!err2 && nearby) {
              for (const d of nearby) {
                const dist = haversineDistance(lat, lng, d.current_lat, d.current_lng);
                if (dist <= 10) {
                  const aId = uuidv4();
                  db.run(
                    'INSERT INTO alerts (id,issue_id,target_driver_id,distance_km,action_suggested) VALUES (?,?,?,?,?)',
                    [aId, id, d.driver_id, dist, action],
                    () => {
                      if (io) io.to(`driver:${d.driver_id}`).emit('new_alert', { alertId: aId, issueId: id, issueType: issue_type, description: description || '', areaName: area_name, distanceText: getApproximateDistance(dist), suggestedAction: action, timestamp: new Date().toISOString() });
                    }
                  );
                }
              }
            }

            db.get('SELECT name, vehicle_number FROM drivers WHERE driver_id=?', [driver_id], (err3, driver) => {
              if (io) {
                getDashboardStats((stats) => io.to('managers').emit('dashboard_update', stats));
                io.to('managers').emit('new_issue', { id, driver_id, driver_name: driver?.name || 'Unknown', vehicle_number: driver?.vehicle_number || 'N/A', issue_type, area_name, status: 'active', verified_count: 0, false_count: 0, created_at: new Date().toISOString() });
              }
              res.status(201).json({ id, message: 'Issue reported', area_name, points: pts });
            });
          });
        });
      }
    );
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/', authenticate, (req, res) => {
  if (req.user.role === 'manager') {
    db.all('SELECT i.*,d.name as driver_name,d.vehicle_number FROM issues i LEFT JOIN drivers d ON i.driver_id=d.driver_id ORDER BY i.created_at DESC LIMIT 100', [], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      res.json(rows);
    });
  } else {
    db.all('SELECT * FROM issues WHERE driver_id=? ORDER BY created_at DESC LIMIT 50', [req.user.driver_id], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      res.json(rows);
    });
  }
});

router.post('/:id/verify', authenticate, requireDriver, (req, res) => {
  db.get('SELECT * FROM issues WHERE id=?', [req.params.id], (err, issue) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!issue) return res.status(404).json({ error: 'Not found' });
    if (issue.driver_id === req.user.driver_id) return res.status(400).json({ error: 'Cannot verify own report' });
    db.run('UPDATE issues SET verified_count=verified_count+1 WHERE id=?', [req.params.id], () => {
      onReportVerified(issue.driver_id, () => {});
      res.json({ message: 'Verified' });
    });
  });
});

router.post('/:id/false-report', authenticate, requireDriver, (req, res) => {
  db.get('SELECT * FROM issues WHERE id=?', [req.params.id], (err, issue) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!issue) return res.status(404).json({ error: 'Not found' });
    if (issue.driver_id === req.user.driver_id) return res.status(400).json({ error: 'Cannot mark own report' });
    db.run('UPDATE issues SET false_count=false_count+1 WHERE id=?', [req.params.id], () => {
      db.get('SELECT false_count FROM issues WHERE id=?', [req.params.id], (err2, upd) => {
        if (upd && upd.false_count >= 3) {
          db.run("UPDATE issues SET status='resolved' WHERE id=?", [req.params.id]);
          onReportMarkedFalse(issue.driver_id, () => {});
        }
        res.json({ message: 'Marked false' });
      });
    });
  });
});

router.get('/alerts/my', authenticate, requireDriver, (req, res) => {
  db.all(
    'SELECT a.*,i.issue_type,i.description,i.area_name,i.created_at as issue_time FROM alerts a JOIN issues i ON a.issue_id=i.id WHERE a.target_driver_id=? ORDER BY a.created_at DESC LIMIT 20',
    [req.user.driver_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      res.json(rows);
    }
  );
});

router.put('/alerts/:alertId/seen', authenticate, requireDriver, (req, res) => {
  db.run('UPDATE alerts SET seen=1 WHERE id=? AND target_driver_id=?', [req.params.alertId, req.user.driver_id], (err) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json({ message: 'Seen' });
  });
});

module.exports = router;
module.exports.getDashboardStats = getDashboardStats;
