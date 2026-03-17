const express = require('express');

// Future auth route registration.
// Prepared for login, session inspection, refresh, and recovery flows.

function createAuthRouter(_deps = {}) {
  const router = express.Router();

  // No active auth endpoints yet. Router intentionally kept empty.
  return router;
}

function registerAuthRoutes(app, deps) {
  app.use('/api/auth', createAuthRouter(deps));
}

module.exports = {
  createAuthRouter,
  registerAuthRoutes,
};
