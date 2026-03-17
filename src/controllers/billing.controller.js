const { successResponse } = require('../shared/apiResponse');

// Future billing controller.
// Will handle checkout, subscription management, and billing webhooks.

function createBillingController(_deps) {
  return {
    getBillingStatus: (_req, res) => {
      return res.status(200).json(
        successResponse({
          feature: 'billing',
          active: false,
        })
      );
    },
  };
}

module.exports = {
  createBillingController,
};
