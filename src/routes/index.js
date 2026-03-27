const { registerMainRoutes } = require('./main.routes');
const { registerAuthRoutes } = require('./auth.routes');
const { registerBillingRoutes } = require('./billing.routes');
const { registerUserRoutes } = require('./user.routes');
const { features } = require('../config/features');

function registerRoutes(app, deps) {
  // Le route specifiche vanno registrate PRIMA del catch-all in registerMainRoutes
  if (features.enableAuth) {
    registerAuthRoutes(app, deps);
  }

  if (features.enableBilling) {
    registerBillingRoutes(app, deps);
  }

  if (features.enableAuth) {
    registerUserRoutes(app, deps);
  }

  // registerMainRoutes contiene app.get('*') che deve stare per ultimo
  registerMainRoutes(app, deps);
}

module.exports = {
  registerRoutes,
};
