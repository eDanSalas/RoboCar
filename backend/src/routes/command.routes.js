const { Router } = require('express');

const {
  createCommand,
  getDeviceCommand,
  updateDeviceStatus
} = require('../controllers/command.controller');
const {
  requireApiToken,
  requireDeviceToken,
  requireConfiguredDevice
} = require('../middlewares/auth.middleware');

const router = Router();

router.post('/commands', requireApiToken, createCommand);
router.get('/devices/:deviceId/command', requireDeviceToken, requireConfiguredDevice, getDeviceCommand);
router.post('/devices/:deviceId/status', requireDeviceToken, requireConfiguredDevice, updateDeviceStatus);

module.exports = router;
