// Future credit model placeholder.
// Intended for credit ledger entries, balance snapshots, and usage debits.

const creditModel = {
  entity: 'Credit',
  key: 'id',
  fields: ['id', 'userId', 'delta', 'reason', 'referenceType', 'referenceId', 'createdAt'],
};

module.exports = {
  creditModel,
};
