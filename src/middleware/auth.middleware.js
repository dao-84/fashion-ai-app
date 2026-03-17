const { AppError } = require('../shared/appError');
const { features } = require('../config/features');

// Future auth middleware.
// For now it stays non-invasive unless auth is explicitly enabled.

function attachOptionalUser(req, _res, next) {
  req.auth = {
    user: null,
    isAuthenticated: false,
  };
  return next();
}

function requireAuth(req, _res, next) {
  if (!features.enableAuth) {
    return next();
  }

  return next(
    new AppError('Authentication not implemented yet', {
      status: 501,
      code: 'AUTH_NOT_IMPLEMENTED',
    })
  );
}

module.exports = {
  attachOptionalUser,
  requireAuth,
};
