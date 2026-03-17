// Future payment model placeholder.
// Intended for checkout records, invoices, subscriptions, and provider references.

const paymentModel = {
  entity: 'Payment',
  key: 'id',
  fields: ['id', 'userId', 'provider', 'status', 'amount', 'currency', 'metadata', 'createdAt'],
};

module.exports = {
  paymentModel,
};
