const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, requireDriver } = require('../middleware/auth');
const { analyzeRouteRisk, suggestAlternateRoute } = require('../services/riskAnalysis');
const { onRouteCompleted } = require('../services/pointsService');
const router = express.Router();
let io = null;
router.setIo = (i) => { io = i; };

router.post('/set', authenticate, requireDriver, (req, res) => {
  try {
    const { route_name, start_point, end_point, distance_km, lat, lng } = req.body;
    if (!route_name) return res.status(400).json({ error: 'route_name required' });
    const driver_id = req.user.driver_id;

    db.run("UPDATE route_history SET status='completed',ended_at=CURRENT_TIMESTAMP WHERE driver_id=? AND status='active'", [driver_id], (err) => {
      if (err) { console.error(err); return res.status(500).json({ error: 'Server error' }); }

      analyzeRouteRisk(route_name, (risk) => {
        const alts = risk.riskLevel !== 'low' ? suggestAlternateRouteSync(route_name) : [];
        const routeId = uuidv4();

        db.run(
          'INSERT INTO route_history (id,driver_id,route_name,start_point,end_point,distance_km,risk_level,risk_reasons) VALUES (?,?,?,?,?,?,?,?)',
          [routeId, driver_id, route_name, start_point || null, end_point || null, distance_km || null, risk.riskLevel, JSON.stringify(risk.reasons)],
          (err2) => {
            if (err2) { console.error(err2); return res.status(500).json({ error: 'Server error' }); }

            const fields = ['current_route=?'];
            const vals = [route_name];
            if (lat != null && lng != null) { fields.push('current_lat=?', 'current_lng=?'); vals.push(lat, lng); }
            vals.push(driver_id);

            db.run(`UPDATE drivers SET ${fields.join(',')} WHERE driver_id=?`, vals, (err3) => {
              if (err3) console.error(err3);
              if (io) io.to('managers').emit('route_update', { driver_id, driverName: req.user.name, route_name, riskLevel: risk.riskLevel, timestamp: new Date().toISOString() });
              suggestAlternateRoute(route_name, (alternates) => {
                const altRoutes = risk.riskLevel !== 'low' ? alternates : [];
                res.status(201).json({ routeId, route_name, riskLevel: risk.riskLevel, riskScore: risk.score, riskReasons: risk.reasons, alternateRoutes: altRoutes, message: 'Route set' });
              });
            });
          }
        );
      });
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/location', authenticate, requireDriver, (req, res) => {
  const { lat, lng } = req.body;
  if (lat == null || lng == null) return res.status(400).json({ error: 'lat and lng required' });
  db.run("UPDATE drivers SET current_lat=?,current_lng=?,status='active' WHERE driver_id=?", [lat, lng, req.user.driver_id], (err) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json({ message: 'Location updated' });
  });
});

router.post('/complete', authenticate, requireDriver, (req, res) => {
  const driver_id = req.user.driver_id;
  db.run("UPDATE route_history SET status='completed',ended_at=CURRENT_TIMESTAMP WHERE driver_id=? AND status='active'", [driver_id], () => {
    db.run("UPDATE drivers SET current_route=NULL,status='idle' WHERE driver_id=?", [driver_id], () => {
      onRouteCompleted(driver_id, (pts) => {
        if (io) io.to('managers').emit('route_completed', { driver_id, driverName: req.user.name });
        res.json({ message: 'Route completed', points: pts });
      });
    });
  });
});

router.get('/my', authenticate, requireDriver, (req, res) => {
  db.all('SELECT * FROM route_history WHERE driver_id=? ORDER BY started_at DESC LIMIT 20', [req.user.driver_id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json(rows);
  });
});

router.get('/current', authenticate, requireDriver, (req, res) => {
  db.get("SELECT * FROM route_history WHERE driver_id=? AND status='active' ORDER BY started_at DESC LIMIT 1", [req.user.driver_id], (err, route) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!route) return res.json({ activeRoute: null });

    analyzeRouteRisk(route.route_name, (fresh) => {
      db.run('UPDATE route_history SET risk_level=?,risk_reasons=? WHERE id=?', [fresh.riskLevel, JSON.stringify(fresh.reasons), route.id], () => {
        suggestAlternateRoute(route.route_name, (alts) => {
          const altRoutes = fresh.riskLevel !== 'low' ? alts : [];
          res.json({ activeRoute: { ...route, risk_reasons: fresh.reasons, riskLevel: fresh.riskLevel }, alternateRoutes: altRoutes });
        });
      });
    });
  });
});

router.get('/all', authenticate, (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Managers only' });
  db.all(
    "SELECT rh.*,d.name as driver_name,d.vehicle_number,d.status as driver_status FROM route_history rh LEFT JOIN drivers d ON rh.driver_id=d.driver_id WHERE rh.status='active' ORDER BY rh.started_at DESC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      res.json(rows);
    }
  );
});

module.exports = router;
