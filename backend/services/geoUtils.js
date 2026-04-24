function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function toRad(deg) { return deg * Math.PI / 180; }
function getApproximateAreaName(lat, lng) {
  return `Zone ${(Math.round(lat*100)/100).toFixed(1)}°N, ${(Math.round(lng*100)/100).toFixed(1)}°E`;
}
function getApproximateDistance(km) {
  if (km < 1) return 'less than 1 km away';
  if (km < 5) return `about ${Math.round(km)} km away`;
  return `approximately ${Math.round(km/5)*5} km away`;
}
module.exports = { haversineDistance, getApproximateAreaName, getApproximateDistance };
