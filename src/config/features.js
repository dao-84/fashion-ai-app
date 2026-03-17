const { env } = require('./env');

const features = {
  enableAuth: false,
  enableBilling: false,
  enableCredits: false,
  enableDatabase: false,
  enableAuthDebugInfo: env.NODE_ENV !== 'production',
};

module.exports = {
  features,
};
