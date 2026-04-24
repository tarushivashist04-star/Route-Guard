const db = require('./backend/db/database');
try {
    const res = db.prepare('SELECT 1 as result').get();
    console.log('Test query result:', res);
} catch (err) {
    console.error('Error:', err);
}
