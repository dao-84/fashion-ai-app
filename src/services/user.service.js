// Future user service.
// Will centralize user account operations, preferences, and profile data rules.

function createUserService(_deps) {
  return {
    async getUserProfile(_userId) {
      return null;
    },

    async updateUserProfile(_input = {}) {
      throw new Error('updateUserProfile is not implemented yet');
    },

    async getUserUsage(_userId) {
      return {
        generations: 0,
        creditsUsed: 0,
      };
    },
  };
}

module.exports = {
  createUserService,
};
