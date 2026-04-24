const db = require('./db/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function ensureDriver() {
    try {
        const mgr = db.prepare("SELECT id FROM managers LIMIT 1").get();
        if(!mgr) {
            console.log("No manager exists. Please register a manager first.");
            return;
        }

        const existing = db.prepare("SELECT * FROM drivers WHERE driver_id='DRV-001'").get();
        if(existing) {
            console.log("Driver ID: DRV-001");
            console.log("Password: The password you set (or 'password123' if it was auto-created)");
            return;
        }

        const id = uuidv4();
        const driver_id = 'DRV-001';
        const password = await bcrypt.hash('password123', 12);
        db.prepare('INSERT INTO drivers (id, driver_id, name, email, password, vehicle_number, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(id, driver_id, 'Demo Driver', 'driver@test.com', password, 'DEMO-123', mgr.id);
        console.log("Created beautifully! Here are the credentials:");
        console.log("Driver ID: DRV-001");
        console.log("Password: password123");
    } catch (e) { console.error(e); }
}
ensureDriver();
