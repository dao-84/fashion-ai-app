const { env } = require('./env');

const features = {
  enableAuth: true,
  enableBilling: false,
  enableCredits: false,
  enableDatabase: true,
  enableAuthDebugInfo: env.NODE_ENV !== 'production',
};

module.exports = {
  features,
};
