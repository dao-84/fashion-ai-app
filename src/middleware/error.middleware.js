const { errorResponse } = require('../shared/apiResponse');

function errorHandler(err, req, res, _next) {
  const status = err?.status || 500;
  const message = err?.message || 'Internal server error';
  const code = err?.code || 'INTERNAL_ERROR';

  if (res.headersSent) {
    return;
  }

  if (req.path.startsWith('/api/')) {
    return res.status(status).json(
      errorResponse(message, {
        code,
        details: err?.details,
      })
    );
  }

  return res.status(status).type('text/plain').send(message);
}

module.exports = {
  errorHandler,
};
