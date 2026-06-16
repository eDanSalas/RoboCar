const { Router } = require('express');

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'robot-car-backend',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
