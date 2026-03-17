const { successResponse } = require('../shared/apiResponse');

// Future auth controller.
// Will adapt request/response handling for authentication and session flows.

function createAuthController(_deps) {
  return {
    getAuthStatus: (_req, res) => {
      return res.status(200).json(
        successResponse({
          feature: 'auth',
          active: false,
        })
      );
    },
  };
}

module.exports = {
  createAuthController,
};
