function readBearerToken(req) {
  const authHeader = req.get('authorization') || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

function requireToken(envName, label) {
  return (req, res, next) => {
    const expectedToken = process.env[envName];

    if (!expectedToken) {
      const error = new Error(`${label} token is not configured.`);
      error.statusCode = 500;
      error.code = 'TOKEN_NOT_CONFIGURED';
      return next(error);
    }

    const token = readBearerToken(req);

    if (!token) {
      const error = new Error('Bearer token is required.');
      error.statusCode = 401;
      error.code = 'TOKEN_REQUIRED';
      return next(error);
    }

    if (token !== expectedToken) {
      const error = new Error('Invalid bearer token.');
      error.statusCode = 403;
      error.code = 'INVALID_TOKEN';
      return next(error);
    }

    next();
  };
}

function requireConfiguredDevice(req, res, next) {
  const expectedDeviceId = process.env.DEVICE_ID;

  if (!expectedDeviceId) {
    const error = new Error('DEVICE_ID is not configured.');
    error.statusCode = 500;
    error.code = 'DEVICE_NOT_CONFIGURED';
    return next(error);
  }

  if (req.params.deviceId !== expectedDeviceId) {
    const error = new Error('Device not found.');
    error.statusCode = 404;
    error.code = 'DEVICE_NOT_FOUND';
    return next(error);
  }

  next();
}

module.exports = {
  requireApiToken: requireToken('API_TOKEN', 'API'),
  requireDeviceToken: requireToken('DEVICE_TOKEN', 'Device'),
  requireConfiguredDevice
};
