const { env } = require('./env');

const features = {
  enableAuth: true,
  enableBilling: true,
  enableCredits: true,
  enableDatabase: true,
  enableAuthDebugInfo: env.NODE_ENV !== 'production',
};

module.exports = {
  features,
};
