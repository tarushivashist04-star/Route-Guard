const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'routeguard_ai_secret';
const token = jwt.sign({ id: 'driver_uuid_placeholder', driver_id: 'DRV-002', name: 'Test Driver', role: 'driver' }, JWT_SECRET, { expiresIn: '1h' });
console.log(token);
