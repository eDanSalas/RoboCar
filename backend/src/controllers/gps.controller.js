const { getGps, saveGps } = require('../services/gps.service');
const { emitToFrontend } = require('../services/socket.service');

function updateGps(req, res, next) {
  try {
    const gps = saveGps(req.params.deviceId, req.body || {}, 'gps_endpoint');

    if (!gps) {
      const error = new Error('GPS payload is required.');
      error.statusCode = 400;
      error.code = 'GPS_PAYLOAD_REQUIRED';
      throw error;
    }

    emitToFrontend('gps:update', gps);

    res.status(201).json({
      ok: true,
      gps
    });
  } catch (error) {
    next(error);
  }
}

function getLatestGps(req, res, next) {
  try {
    res.json({
      ok: true,
      deviceId: req.params.deviceId,
      gps: getGps()
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getLatestGps,
  updateGps
};
