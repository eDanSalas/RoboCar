const { Router } = require('express');

const {
  getLatestGps,
  updateGps
} = require('../controllers/gps.controller');
const {
  requireApiToken,
  requireDeviceToken,
  requireConfiguredDevice
} = require('../middlewares/auth.middleware');

const router = Router();

router.post('/devices/:deviceId/gps', requireDeviceToken, requireConfiguredDevice, updateGps);
router.get('/devices/:deviceId/gps', requireApiToken, requireConfiguredDevice, getLatestGps);

module.exports = router;
