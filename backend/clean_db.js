const db = require('./db/database.js');

try {
  const t = db.transaction(() => {
    db.prepare('DELETE FROM alerts').run();
    db.prepare('DELETE FROM point_transactions').run();
    db.prepare('DELETE FROM route_history').run();
    db.prepare('DELETE FROM issues').run();
    db.prepare('DELETE FROM drivers').run();
  });
  t();
  console.log('Database successfully cleaned! Kept manager accounts.');
} catch (e) {
  console.error('Error cleaning database', e);
}
