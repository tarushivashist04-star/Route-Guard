const db = require('./backend/db/database');
try {
    db.get('SELECT 1 as result', (err, res) => {
        if (err) {
            console.error('Error:', err);
        } else {
            console.log('Test query result:', res);
        }
    });
} catch (err) {
    console.error('Catch Error:', err);
}
