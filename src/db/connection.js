const { features } = require('../config/features');

let databaseState = {
  initialized: false,
  provider: null,
};

async function initializeDatabase() {
  if (!features.enableDatabase) {
    databaseState = {
      initialized: false,
      provider: null,
    };
    return databaseState;
  }

  // Placeholder only. Real provider wiring will be added later.
  databaseState = {
    initialized: false,
    provider: 'pending',
  };
  return databaseState;
}

function getDatabaseState() {
  return { ...databaseState };
}

module.exports = {
  initializeDatabase,
  getDatabaseState,
};
