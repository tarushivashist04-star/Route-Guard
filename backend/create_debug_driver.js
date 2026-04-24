const db = require('./db/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function create() {
    try {
        const id = uuidv4();
        const driver_id = 'DEBUG_DRV';
        const password = await bcrypt.hash('password123', 12);
        db.prepare('INSERT INTO drivers (id, driver_id, name, email, password, vehicle_number, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(id, driver_id, 'Debug Driver', 'debug@test.com', password, 'DEBUG-001', '1bff013f-6a34-4f7e-b244-16d928e8a45d');
        console.log('✅ Debug driver created: DEBUG_DRV / password123');
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            console.log('✅ Debug driver already exists');
        } else {
            console.error('Error:', err);
        }
    }
}
create();
