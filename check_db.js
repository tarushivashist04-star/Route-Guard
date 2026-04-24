const db = require('./backend/db/database');
try {
    const issues = db.prepare('SELECT * FROM issues').all();
    console.log('Issues in database:', issues);
} catch (err) {
    console.error('Error listing issues:', err);
}
