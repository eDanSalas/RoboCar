const express = require('express');
const { Router } = require('express');

const {
  uploadFrame,
  getLatestFrame
} = require('../controllers/camera.controller');
const { requireDeviceToken } = require('../middlewares/auth.middleware');
const { getMaxFrameSizeMb } = require('../services/camera.service');

const router = Router();

router.post(
  '/frame',
  requireDeviceToken,
  express.raw({
    type: 'image/jpeg',
    limit: `${getMaxFrameSizeMb()}mb`
  }),
  uploadFrame
);

router.get('/latest.jpg', getLatestFrame);

module.exports = router;
