const {
  saveCommand,
  getCommandForDevice,
  saveDeviceStatus
} = require('../services/command.service');
const { emitToFrontend } = require('../services/socket.service');

function createCommand(req, res, next) {
  try {
    const command = saveCommand(req.body || {});

    emitToFrontend('car:command', command);

    res.status(201).json({
      ok: true,
      command
    });
  } catch (error) {
    next(error);
  }
}

function getDeviceCommand(req, res, next) {
  try {
    const command = getCommandForDevice(req.params.deviceId);

    res.json({
      ok: true,
      deviceId: req.params.deviceId,
      command
    });
  } catch (error) {
    next(error);
  }
}

function updateDeviceStatus(req, res, next) {
  try {
    const status = saveDeviceStatus(req.params.deviceId, req.body || {});

    emitToFrontend('car:status', status);

    res.json({
      ok: true,
      status
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createCommand,
  getDeviceCommand,
  updateDeviceStatus
};
