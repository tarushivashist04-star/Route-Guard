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
    db.prepare("UPDATE route_history SET status='completed',ended_at=CURRENT_TIMESTAMP WHERE driver_id=? AND status='active'").run(driver_id);
    const risk = analyzeRouteRisk(route_name);
    const alts = risk.riskLevel !== 'low' ? suggestAlternateRoute(route_name) : [];
    const routeId = uuidv4();
    db.prepare('INSERT INTO route_history (id,driver_id,route_name,start_point,end_point,distance_km,risk_level,risk_reasons) VALUES (?,?,?,?,?,?,?,?)').run(routeId, driver_id, route_name, start_point||null, end_point||null, distance_km||null, risk.riskLevel, JSON.stringify(risk.reasons));
    const fields = ['current_route=?']; const vals = [route_name];
    if (lat!=null && lng!=null) { fields.push('current_lat=?','current_lng=?'); vals.push(lat,lng); }
    vals.push(driver_id);
    db.prepare(`UPDATE drivers SET ${fields.join(',')} WHERE driver_id=?`).run(...vals);
    if (io) io.to('managers').emit('route_update', { driver_id, driverName: req.user.name, route_name, riskLevel: risk.riskLevel, timestamp: new Date().toISOString() });
    res.status(201).json({ routeId, route_name, riskLevel: risk.riskLevel, riskScore: risk.score, riskReasons: risk.reasons, alternateRoutes: alts, message: 'Route set' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/location', authenticate, requireDriver, (req, res) => {
  const { lat, lng } = req.body;
  if (lat==null || lng==null) return res.status(400).json({ error: 'lat and lng required' });
  db.prepare("UPDATE drivers SET current_lat=?,current_lng=?,status='active' WHERE driver_id=?").run(lat, lng, req.user.driver_id);
  res.json({ message: 'Location updated' });
});

router.post('/complete', authenticate, requireDriver, (req, res) => {
  const driver_id = req.user.driver_id;
  db.prepare("UPDATE route_history SET status='completed',ended_at=CURRENT_TIMESTAMP WHERE driver_id=? AND status='active'").run(driver_id);
  db.prepare("UPDATE drivers SET current_route=NULL,status='idle' WHERE driver_id=?").run(driver_id);
  const pts = onRouteCompleted(driver_id);
  if (io) io.to('managers').emit('route_completed', { driver_id, driverName: req.user.name });
  res.json({ message: 'Route completed', points: pts });
});

router.get('/my', authenticate, requireDriver, (req, res) => {
  res.json(db.prepare('SELECT * FROM route_history WHERE driver_id=? ORDER BY started_at DESC LIMIT 20').all(req.user.driver_id));
});

router.get('/current', authenticate, requireDriver, (req, res) => {
  const route = db.prepare("SELECT * FROM route_history WHERE driver_id=? AND status='active' ORDER BY started_at DESC LIMIT 1").get(req.user.driver_id);
  if (!route) return res.json({ activeRoute: null });
  const fresh = analyzeRouteRisk(route.route_name);
  const alts = fresh.riskLevel !== 'low' ? suggestAlternateRoute(route.route_name) : [];
  db.prepare('UPDATE route_history SET risk_level=?,risk_reasons=? WHERE id=?').run(fresh.riskLevel, JSON.stringify(fresh.reasons), route.id);
  res.json({ activeRoute: { ...route, risk_reasons: fresh.reasons, riskLevel: fresh.riskLevel }, alternateRoutes: alts });
});

router.get('/all', authenticate, (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Managers only' });
  res.json(db.prepare("SELECT rh.*,d.name as driver_name,d.vehicle_number,d.status as driver_status FROM route_history rh LEFT JOIN drivers d ON rh.driver_id=d.driver_id WHERE rh.status='active' ORDER BY rh.started_at DESC").all());
});

module.exports = router;
