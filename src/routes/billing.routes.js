const express = require('express');

// Future billing route registration.
// Prepared for checkout, invoice inspection, subscriptions, and webhooks.

function createBillingRouter(_deps = {}) {
  const router = express.Router();

  // No active billing endpoints yet. Router intentionally kept empty.
  return router;
}

function registerBillingRoutes(app, deps) {
  app.use('/api/billing', createBillingRouter(deps));
}

module.exports = {
  createBillingRouter,
  registerBillingRoutes,
};
