const { errorResponse } = require('../shared/apiResponse');

function notFoundHandler(req, res, _next) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json(
      errorResponse('Route not found', {
        code: 'ROUTE_NOT_FOUND',
      })
    );
  }

  return res.status(404).type('text/plain').send('Not found');
}

module.exports = {
  notFoundHandler,
};
