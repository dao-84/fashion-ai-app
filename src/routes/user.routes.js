const express = require('express');

// Future user route registration.
// Prepared for profile, account settings, usage history, and preferences.

function createUserRouter(_deps = {}) {
  const router = express.Router();

  // No active user endpoints yet. Router intentionally kept empty.
  return router;
}

function registerUserRoutes(app, deps) {
  app.use('/api/user', createUserRouter(deps));
}

module.exports = {
  createUserRouter,
  registerUserRoutes,
};
