const {
  saveFrame,
  getFrame,
  getFrameInfo
} = require('../services/camera.service');
const { emitToFrontend } = require('../services/socket.service');

function uploadFrame(req, res, next) {
  try {
    if (!req.is('image/jpeg')) {
      const error = new Error('Content-Type must be image/jpeg.');
      error.statusCode = 415;
      error.code = 'UNSUPPORTED_MEDIA_TYPE';
      throw error;
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      const error = new Error('JPEG frame is required.');
      error.statusCode = 400;
      error.code = 'EMPTY_FRAME';
      throw error;
    }

    const frame = saveFrame(req.body);
    const info = getFrameInfo();

    emitToFrontend('camera:frame', {
      ...info,
      encoding: 'base64',
      data: frame.buffer.toString('base64')
    });
    emitToFrontend('camera:info', info);

    res.status(201).json({
      ok: true,
      frame: info
    });
  } catch (error) {
    next(error);
  }
}

function getLatestFrame(req, res, next) {
  try {
    const frame = getFrame();

    if (!frame) {
      const error = new Error('No camera frame has been uploaded yet.');
      error.statusCode = 404;
      error.code = 'FRAME_NOT_FOUND';
      throw error;
    }

    res.set({
      'Content-Type': frame.mimeType,
      'Content-Length': frame.sizeBytes,
      'Cache-Control': 'no-store',
      'X-Frame-Received-At': frame.receivedAt
    });
    res.send(frame.buffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadFrame,
  getLatestFrame
};
