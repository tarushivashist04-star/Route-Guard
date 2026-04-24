const db = require('./backend/db/database');
const { v4: uuidv4 } = require('uuid');

try {
    const driverId = 'DRV-002'; // From logs
    const id = uuidv4();
    const issue_type = 'accident';
    const lat = 19.0760;
    const lng = 72.8777;
    const area_name = 'Test Area';
    
    console.log('Attempting to insert issue...');
    db.prepare('INSERT INTO issues (id, driver_id, issue_type, description, lat, lng, area_name) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, driverId, issue_type, 'Test description', lat, lng, area_name);
    console.log('✅ Issue inserted successfully');
    
    const issue = db.prepare('SELECT * FROM issues WHERE id = ?').get(id);
    console.log('Retrieved issue:', issue);
} catch (err) {
    console.error('❌ Error testing issue insertion:', err);
}
