const db = require('./backend/db/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function create() {
    try {
        const id = uuidv4();
        const driver_id = 'DEBUG_DRV';
        const password = await bcrypt.hash('password123', 12);
        db.prepare('INSERT INTO drivers (id, driver_id, name, email, password, vehicle_number, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(id, driver_id, 'Debug Driver', 'debug@test.com', password, 'DEBUG-001', 'system');
        console.log('✅ Debug driver created: DEBUG_DRV / password123');
    } catch (err) {
        console.error('Error:', err);
    }
}
create();
