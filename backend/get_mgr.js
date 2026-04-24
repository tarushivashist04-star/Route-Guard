const db = require('./db/database');
try {
    const mgr = db.prepare('SELECT id FROM managers LIMIT 1').get();
    console.log('Manager:', mgr);
} catch (err) {
    console.error('Error:', err);
}
