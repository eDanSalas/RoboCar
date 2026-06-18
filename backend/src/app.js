require('./config/env');

const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health.routes');
const commandRoutes = require('./routes/command.routes');
const cameraRoutes = require('./routes/camera.routes');
const gpsRoutes = require('./routes/gps.routes');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');
const { getCorsOptions } = require('./services/cors.service');

const app = express();

app.use(cors(getCorsOptions()));

app.use(express.json({ limit: '64kb' }));

app.use('/api', healthRoutes);
app.use('/api', commandRoutes);
app.use('/api', gpsRoutes);
app.use('/api/camera', cameraRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
