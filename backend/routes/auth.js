const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'routeguard_ai_secret';

router.post('/manager/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

    db.get('SELECT id FROM managers WHERE email=?', [email], async (err, existing) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      if (existing) return res.status(409).json({ error: 'Email already registered' });

      const id = uuidv4();
      const hash = await bcrypt.hash(password, 12);
      db.run('INSERT INTO managers (id,name,email,password) VALUES (?,?,?,?)', [id, name, email, hash], (err2) => {
        if (err2) return res.status(500).json({ error: 'Server error' });
        const token = jwt.sign({ id, email, name, role: 'manager' }, JWT_SECRET, { expiresIn: '12h' });
        res.status(201).json({ token, manager: { id, name, email } });
      });
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/manager/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'All fields required' });

    db.get('SELECT * FROM managers WHERE email=?', [email], async (err, mgr) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      if (!mgr || !await bcrypt.compare(password, mgr.password)) return res.status(401).json({ error: 'Invalid credentials' });
      const token = jwt.sign({ id: mgr.id, email: mgr.email, name: mgr.name, role: 'manager' }, JWT_SECRET, { expiresIn: '12h' });
      res.json({ token, manager: { id: mgr.id, name: mgr.name, email: mgr.email } });
    });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/driver/login', async (req, res) => {
  try {
    const { driver_id, password } = req.body;
    if (!driver_id || !password) return res.status(400).json({ error: 'Driver ID and password required' });

    db.get('SELECT * FROM drivers WHERE driver_id=?', [driver_id], async (err, drv) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      if (!drv) return res.status(401).json({ error: 'Driver ID not found. Contact your manager to get an account.' });
      if (!await bcrypt.compare(password, drv.password)) return res.status(401).json({ error: 'Invalid password' });

      db.run("UPDATE drivers SET status='active' WHERE driver_id=?", [driver_id], (err2) => {
        if (err2) console.error(err2);
        const token = jwt.sign({ id: drv.id, driver_id: drv.driver_id, name: drv.name, role: 'driver', vehicle_number: drv.vehicle_number }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token, driver: { id: drv.id, driver_id: drv.driver_id, name: drv.name, email: drv.email, vehicle_number: drv.vehicle_number, phone: drv.phone, current_route: drv.current_route, points: drv.points, trust_score: drv.trust_score, status: 'active' } });
      });
    });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/logout', (req, res) => {
  try {
    const h = req.headers.authorization;
    if (h?.startsWith('Bearer ')) {
      const d = jwt.verify(h.split(' ')[1], JWT_SECRET);
      if (d.role === 'driver') db.run("UPDATE drivers SET status='offline' WHERE driver_id=?", [d.driver_id]);
    }
  } catch (_) {}
  res.json({ message: 'Logged out' });
});

module.exports = router;
