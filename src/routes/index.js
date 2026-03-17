const { registerMainRoutes } = require('./main.routes');
const { registerAuthRoutes } = require('./auth.routes');
const { registerBillingRoutes } = require('./billing.routes');
const { registerUserRoutes } = require('./user.routes');
const { features } = require('../config/features');

function registerRoutes(app, deps) {
  registerMainRoutes(app, deps);

  // Future modules stay disabled until corresponding features are explicitly enabled.
  if (features.enableAuth) {
    registerAuthRoutes(app, deps);
  }

  if (features.enableBilling) {
    registerBillingRoutes(app, deps);
  }

  if (features.enableAuth) {
    registerUserRoutes(app, deps);
  }
}

module.exports = {
  registerRoutes,
};
