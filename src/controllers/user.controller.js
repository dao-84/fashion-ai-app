const { successResponse } = require('../shared/apiResponse');

// Future user controller.
// Will handle profile, account, and usage-related HTTP endpoints.

function createUserController(_deps) {
  return {
    getUserStatus: (_req, res) => {
      return res.status(200).json(
        successResponse({
          feature: 'user',
          active: false,
        })
      );
    },
  };
}

module.exports = {
  createUserController,
};
