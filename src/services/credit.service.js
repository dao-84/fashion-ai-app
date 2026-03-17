// Future credit service.
// Will manage credit balance, debits for generations, refunds, and usage accounting.

function createCreditService(_deps) {
  return {
    async getUserCredits(_userId) {
      return {
        balance: 0,
        currency: 'credits',
      };
    },

    async consumeCredits(_input = {}) {
      throw new Error('consumeCredits is not implemented yet');
    },

    async addCredits(_input = {}) {
      throw new Error('addCredits is not implemented yet');
    },
  };
}

module.exports = {
  createCreditService,
};
