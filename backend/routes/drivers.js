const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');
const router = express.Router();

router.use(authenticate, requireManager);

router.get('/', (req, res) => {
  try {
    const drivers = db.prepare(`
      SELECT d.*, COALESCE((SELECT COUNT(*) FROM issues i WHERE i.driver_id=d.driver_id AND i.status='active'),0) AS active_issues,
      (SELECT route_name FROM route_history r WHERE r.driver_id=d.driver_id AND r.status='active' ORDER BY r.started_at DESC LIMIT 1) AS active_route
      FROM drivers d ORDER BY d.created_at DESC
    `).all();
    res.json(drivers.map(({ password, ...d }) => d));
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:driverId', (req, res) => {
  const d = db.prepare('SELECT * FROM drivers WHERE driver_id=?').get(req.params.driverId);
  if (!d) return res.status(404).json({ error: 'Not found' });
  const { password, ...safe } = d;
  res.json(safe);
});

router.post('/', async (req, res) => {
  try {
    const { driver_id, name, email, password, vehicle_number, phone, license_number } = req.body;
    if (!driver_id || !name || !email || !password || !vehicle_number) return res.status(400).json({ error: 'Required fields missing' });
    if (db.prepare('SELECT id FROM drivers WHERE driver_id=?').get(driver_id)) return res.status(409).json({ error: 'Driver ID already exists' });
    const id = uuidv4();
    db.prepare('INSERT INTO drivers (id,driver_id,name,email,password,vehicle_number,phone,license_number,created_by) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(id, driver_id, name, email, await bcrypt.hash(password, 12), vehicle_number, phone||null, license_number||null, req.user.id);
    res.status(201).json({ id, driver_id, name, email, vehicle_number, phone, license_number, status:'offline', points:0, trust_score:5.0 });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:driverId', async (req, res) => {
  try {
    const { name, email, vehicle_number, phone, license_number, password } = req.body;
    const d = db.prepare('SELECT * FROM drivers WHERE driver_id=?').get(req.params.driverId);
    if (!d) return res.status(404).json({ error: 'Not found' });
    const hash = password ? await bcrypt.hash(password, 12) : d.password;
    db.prepare('UPDATE drivers SET name=?,email=?,vehicle_number=?,phone=?,license_number=?,password=? WHERE driver_id=?')
      .run(name||d.name, email||d.email, vehicle_number||d.vehicle_number, phone??d.phone, license_number??d.license_number, hash, req.params.driverId);
    res.json({ message: 'Updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:driverId', (req, res) => {
  const d = db.prepare('SELECT id FROM drivers WHERE driver_id=?').get(req.params.driverId);
  if (!d) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM drivers WHERE driver_id=?').run(req.params.driverId);
  res.json({ message: 'Deleted' });
});

module.exports = router;
