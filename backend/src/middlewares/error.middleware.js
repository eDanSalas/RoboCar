function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found.'
    }
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || error.status || 500;
  const code = error.code || (statusCode === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');
  let message = error.message || 'Unexpected error.';

  if (error.type === 'entity.too.large') {
    message = 'Request body is too large.';
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    message = 'Invalid JSON body.';
  }

  if (statusCode >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${statusCode} ${code}: ${message}`);
  }

  res.status(statusCode).json({
    ok: false,
    error: {
      code,
      message
    }
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
