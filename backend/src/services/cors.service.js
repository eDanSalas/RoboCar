function getAllowedOrigins() {
  const rawOrigins = process.env.FRONTEND_ORIGIN || '*';
  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isOriginAllowed(origin) {
  const allowedOrigins = getAllowedOrigins();

  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes('*')) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

function corsOrigin(origin, callback) {
  callback(null, isOriginAllowed(origin));
}

function getCorsOptions() {
  return {
    origin: corsOrigin,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400
  };
}

module.exports = {
  getAllowedOrigins,
  getCorsOptions,
  isOriginAllowed
};
