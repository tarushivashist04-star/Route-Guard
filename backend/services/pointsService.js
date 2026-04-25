const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');

const POINTS = { REPORT_SUBMITTED: 5, REPORT_VERIFIED: 10, REPORT_FALSE: -8, ROUTE_COMPLETED: 3 };

function updatePoints(driverId, pointsChange, reason, callback) {
  db.run(
    'INSERT INTO point_transactions (id, driver_id, points_change, reason) VALUES (?, ?, ?, ?)',
    [uuidv4(), driverId, pointsChange, reason],
    () => {
      db.run('UPDATE drivers SET points = MAX(0, points + ?) WHERE driver_id = ?', [pointsChange, driverId], () => {
        db.get('SELECT points FROM drivers WHERE driver_id = ?', [driverId], (err, driver) => {
          if (driver) {
            const trust = Math.min(10.0, Math.max(0.0, 5.0 + Math.log10(Math.max(1, driver.points)) * 2));
            db.run('UPDATE drivers SET trust_score = ? WHERE driver_id = ?', [Math.round(trust * 10) / 10, driverId], () => {
              db.get('SELECT points, trust_score FROM drivers WHERE driver_id = ?', [driverId], (err2, result) => {
                if (callback) callback(result);
              });
            });
          } else {
            if (callback) callback(null);
          }
        });
      });
    }
  );
}

const onReportSubmitted  = (id, cb) => updatePoints(id, POINTS.REPORT_SUBMITTED, 'Issue report submitted', cb);
const onReportVerified   = (id, cb) => updatePoints(id, POINTS.REPORT_VERIFIED,  'Report verified by peer', cb);
const onReportMarkedFalse = (id, cb) => updatePoints(id, POINTS.REPORT_FALSE,    'Report marked as false', cb);
const onRouteCompleted   = (id, cb) => updatePoints(id, POINTS.ROUTE_COMPLETED,  'Route completed', cb);

function getPointsHistory(driverId, callback) {
  db.all(
    'SELECT * FROM point_transactions WHERE driver_id = ? ORDER BY created_at DESC LIMIT 20',
    [driverId],
    (err, rows) => { callback(rows || []); }
  );
}

module.exports = { updatePoints, onReportSubmitted, onReportVerified, onReportMarkedFalse, onRouteCompleted, getPointsHistory, POINTS };
