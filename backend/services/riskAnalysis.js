const db = require('../db/database');

const ISSUE_WEIGHT = { accident:10, roadblock:8, fog:6, flood:9, traffic:4, construction:5, pothole:3, other:3 };
const TIME_HIGH = [0,1,2,3,4,5,22,23];
const TIME_MED  = [6,7,8,17,18,19,20];

function analyzeRouteRisk(routeName) {
  const hour = new Date().getHours();
  const issues = db.prepare(`
    SELECT issue_type, verified_count, false_count FROM issues
    WHERE area_name LIKE ? AND status='active' AND created_at >= datetime('now','-3 hours')
  `).all(`%${routeName.split(' ')[0]}%`);

  let score = 0, reasons = [];
  for (const i of issues) {
    const w = ISSUE_WEIGHT[i.issue_type] || 3;
    score += w * (i.verified_count > 0 ? 1.5 : 1) * (i.false_count > 2 ? 0.3 : 1);
    reasons.push(`${i.issue_type} reported`);
  }
  if (TIME_HIGH.includes(hour)) { score += 5; reasons.push('night hours (low visibility)'); }
  else if (TIME_MED.includes(hour)) { score += 2; reasons.push('peak rush hour'); }

  const riskLevel = score >= 15 ? 'high' : score >= 7 ? 'medium' : 'low';
  return { riskLevel, score: Math.round(score), reasons: reasons.length ? [...new Set(reasons)] : ['No active issues'], issueCount: issues.length };
}

function suggestAlternateRoute(currentRoute) {
  return db.prepare(`
    SELECT route_name, start_point, end_point, COUNT(*) as uso
    FROM route_history WHERE route_name!=? AND risk_level='low' AND status IN ('active','completed')
    AND started_at >= datetime('now','-6 hours') GROUP BY route_name ORDER BY uso DESC LIMIT 3
  `).all(currentRoute).map(r => ({ name: r.route_name, start: r.start_point, end: r.end_point, reason: `Used by ${r.uso} driver(s) with low risk` }));
}

function getSuggestedAction(type) {
  const a = { accident:'Avoid this area — take alternate route immediately', roadblock:'Route blocked — reroute now', fog:'Reduce speed — low visibility ahead', flood:'Road flooded — find alternate route', traffic:'Heavy traffic — consider alternate route', construction:'Construction zone — expect delays', pothole:'Road damage ahead — slow down', other:'Road hazard — proceed with caution' };
  return a[type] || a.other;
}

module.exports = { analyzeRouteRisk, suggestAlternateRoute, getSuggestedAction };
