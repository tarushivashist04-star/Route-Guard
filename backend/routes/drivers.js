const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, requireManager } = require('../middleware/auth');
const router = express.Router();

router.use(authenticate, requireManager);

router.get('/', (req, res) => {
  const sql = `
    SELECT d.*, COALESCE((SELECT COUNT(*) FROM issues i WHERE i.driver_id=d.driver_id AND i.status='active'),0) AS active_issues,
    (SELECT route_name FROM route_history r WHERE r.driver_id=d.driver_id AND r.status='active' ORDER BY r.started_at DESC LIMIT 1) AS active_route
    FROM drivers d ORDER BY d.created_at DESC
  `;
  db.all(sql, [], (err, drivers) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json(drivers.map(({ password, ...d }) => d));
  });
});

router.get('/:driverId', (req, res) => {
  db.get('SELECT * FROM drivers WHERE driver_id=?', [req.params.driverId], (err, d) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!d) return res.status(404).json({ error: 'Not found' });
    const { password, ...safe } = d;
    res.json(safe);
  });
});

router.post('/', async (req, res) => {
  try {
    const { driver_id, name, email, password, vehicle_number, phone, license_number } = req.body;
    if (!driver_id || !name || !email || !password || !vehicle_number) return res.status(400).json({ error: 'Required fields missing' });

    db.get('SELECT id FROM drivers WHERE driver_id=?', [driver_id], async (err, existing) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      if (existing) return res.status(409).json({ error: 'Driver ID already exists' });

      const id = uuidv4();
      const hash = await bcrypt.hash(password, 12);
      db.run(
        'INSERT INTO drivers (id,driver_id,name,email,password,vehicle_number,phone,license_number,created_by) VALUES (?,?,?,?,?,?,?,?,?)',
        [id, driver_id, name, email, hash, vehicle_number, phone || null, license_number || null, req.user.id],
        (err2) => {
          if (err2) return res.status(500).json({ error: 'Server error' });
          res.status(201).json({ id, driver_id, name, email, vehicle_number, phone, license_number, status: 'offline', points: 0, trust_score: 5.0 });
        }
      );
    });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:driverId', async (req, res) => {
  try {
    const { name, email, vehicle_number, phone, license_number, password } = req.body;
    db.get('SELECT * FROM drivers WHERE driver_id=?', [req.params.driverId], async (err, d) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      if (!d) return res.status(404).json({ error: 'Not found' });
      const hash = password ? await bcrypt.hash(password, 12) : d.password;
      db.run(
        'UPDATE drivers SET name=?,email=?,vehicle_number=?,phone=?,license_number=?,password=? WHERE driver_id=?',
        [name || d.name, email || d.email, vehicle_number || d.vehicle_number, phone ?? d.phone, license_number ?? d.license_number, hash, req.params.driverId],
        (err2) => {
          if (err2) return res.status(500).json({ error: 'Server error' });
          res.json({ message: 'Updated' });
        }
      );
    });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:driverId', (req, res) => {
  db.get('SELECT id FROM drivers WHERE driver_id=?', [req.params.driverId], (err, d) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!d) return res.status(404).json({ error: 'Not found' });
    db.run('DELETE FROM drivers WHERE driver_id=?', [req.params.driverId], (err2) => {
      if (err2) return res.status(500).json({ error: 'Server error' });
      res.json({ message: 'Deleted' });
    });
  });
});

module.exports = router;
