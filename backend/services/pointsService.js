const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');

const POINTS = { REPORT_SUBMITTED: 5, REPORT_VERIFIED: 10, REPORT_FALSE: -8, ROUTE_COMPLETED: 3 };

function updatePoints(driverId, pointsChange, reason) {
  db.prepare('INSERT INTO point_transactions (id, driver_id, points_change, reason) VALUES (?, ?, ?, ?)')
    .run(uuidv4(), driverId, pointsChange, reason);
  db.prepare('UPDATE drivers SET points = MAX(0, points + ?) WHERE driver_id = ?').run(pointsChange, driverId);
  const driver = db.prepare('SELECT points FROM drivers WHERE driver_id = ?').get(driverId);
  if (driver) {
    const trust = Math.min(10.0, Math.max(0.0, 5.0 + Math.log10(Math.max(1, driver.points)) * 2));
    db.prepare('UPDATE drivers SET trust_score = ? WHERE driver_id = ?').run(Math.round(trust*10)/10, driverId);
  }
  return db.prepare('SELECT points, trust_score FROM drivers WHERE driver_id = ?').get(driverId);
}

const onReportSubmitted = (id) => updatePoints(id, POINTS.REPORT_SUBMITTED, 'Issue report submitted');
const onReportVerified  = (id) => updatePoints(id, POINTS.REPORT_VERIFIED,  'Report verified by peer');
const onReportMarkedFalse = (id) => updatePoints(id, POINTS.REPORT_FALSE,   'Report marked as false');
const onRouteCompleted  = (id) => updatePoints(id, POINTS.ROUTE_COMPLETED,  'Route completed');
const getPointsHistory  = (id) => db.prepare('SELECT * FROM point_transactions WHERE driver_id = ? ORDER BY created_at DESC LIMIT 20').all(id);

module.exports = { updatePoints, onReportSubmitted, onReportVerified, onReportMarkedFalse, onRouteCompleted, getPointsHistory, POINTS };
