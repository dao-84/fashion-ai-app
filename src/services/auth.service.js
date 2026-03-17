// Future auth service.
// Will contain authentication orchestration, token verification, and account access rules.

function createAuthService(_deps) {
  return {
    async registerUser(_input = {}) {
      throw new Error('registerUser is not implemented yet');
    },

    async loginUser(_input = {}) {
      throw new Error('loginUser is not implemented yet');
    },

    async verifySession(_input = {}) {
      return {
        isValid: false,
        user: null,
      };
    },
  };
}

module.exports = {
  createAuthService,
};
