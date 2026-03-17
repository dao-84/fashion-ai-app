// Future payment service.
// Will orchestrate provider-specific payment flows and billing state transitions.

function createPaymentService(_deps) {
  return {
    async createCheckoutSession(_input = {}) {
      throw new Error('createCheckoutSession is not implemented yet');
    },

    async handleWebhook(_input = {}) {
      throw new Error('handleWebhook is not implemented yet');
    },

    async getBillingOverview(_input = {}) {
      return {
        provider: null,
        subscriptions: [],
        invoices: [],
      };
    },
  };
}

module.exports = {
  createPaymentService,
};
