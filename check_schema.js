const db = require('./backend/db/database');
try {
    const tables = db.prepare('SELECT name, sql FROM sqlite_master WHERE type="table"').all();
    console.log('Tables schema:', tables);
} catch (err) {
    console.error('Error:', err);
}
