let latestGps = null;

function saveGps(deviceId, payload, source = 'gps') {
  const gpsPayload = extractGpsPayload(payload);

  if (!gpsPayload) {
    return null;
  }

  const lat = readNumber(gpsPayload.lat ?? gpsPayload.latitude);
  const lng = readNumber(gpsPayload.lng ?? gpsPayload.lon ?? gpsPayload.longitude);
  const valid = Boolean(gpsPayload.valid) && isValidCoordinate(lat, lng);

  if (Boolean(gpsPayload.valid) && !valid) {
    const error = new Error('GPS latitude/longitude are out of range.');
    error.statusCode = 400;
    error.code = 'INVALID_GPS_COORDINATES';
    throw error;
  }

  latestGps = {
    available: true,
    deviceId,
    source,
    valid,
    updated: Boolean(gpsPayload.updated),
    lat,
    lng,
    ageMs: readNumber(gpsPayload.ageMs),
    satellites: readInteger(gpsPayload.satellites),
    hdopValid: Boolean(gpsPayload.hdopValid),
    hdop: readNumber(gpsPayload.hdop),
    altitudeValid: Boolean(gpsPayload.altitudeValid),
    altitudeMeters: readNumber(gpsPayload.altitudeMeters ?? gpsPayload.altitude),
    speedValid: Boolean(gpsPayload.speedValid),
    speedKmph: readNumber(gpsPayload.speedKmph ?? gpsPayload.speed),
    courseValid: Boolean(gpsPayload.courseValid),
    courseDeg: readNumber(gpsPayload.courseDeg ?? gpsPayload.course),
    charsProcessed: readInteger(gpsPayload.charsProcessed),
    sentencesWithFix: readInteger(gpsPayload.sentencesWithFix),
    mapsUrl: valid ? `https://maps.google.com/?q=${lat},${lng}` : null,
    receivedAt: new Date().toISOString()
  };

  return latestGps;
}

function getGps() {
  return latestGps || {
    available: false,
    valid: false,
    receivedAt: null
  };
}

function extractGpsPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (payload.gps && typeof payload.gps === 'object') {
    return payload.gps;
  }

  if (
    'lat' in payload ||
    'lng' in payload ||
    'latitude' in payload ||
    'longitude' in payload ||
    'lon' in payload
  ) {
    return payload;
  }

  return null;
}

function readNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function readInteger(value) {
  const numberValue = readNumber(value);
  return numberValue === null ? 0 : Math.trunc(numberValue);
}

function isValidCoordinate(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

module.exports = {
  extractGpsPayload,
  getGps,
  saveGps
};
