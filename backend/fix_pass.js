const db = require('./db/database');
const bcrypt = require('bcryptjs');

async function fix() {
    const password = await bcrypt.hash('password123', 12);
    db.prepare('UPDATE drivers SET password = ? WHERE driver_id = ?').run(password, 'DRV-002');
    console.log('✅ DRV-002 password reset to password123');
}
fix();
