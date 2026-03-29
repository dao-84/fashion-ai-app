const { features } = require('../config/features');
const { env } = require('../config/env');
const { CREATE_USERS, CREATE_GENERATIONS, CREATE_CREDIT_TRANSACTIONS } = require('./schema');

let pool = null;

let databaseState = {
  initialized: false,
  provider: null,
};

async function initializeDatabase() {
  if (!features.enableDatabase) {
    databaseState = { initialized: false, provider: null };
    return databaseState;
  }

  if (!env.DATABASE_URL) {
    console.warn('[db] DATABASE_URL non configurato. Aggiungi la variabile in .env');
    databaseState = { initialized: false, provider: null };
    return databaseState;
  }

  try {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    // Crea le tabelle se non esistono
    await pool.query(CREATE_USERS);
    await pool.query(CREATE_GENERATIONS);
    await pool.query(CREATE_CREDIT_TRANSACTIONS);

    // Migrazione: converti colonne crediti da INTEGER a NUMERIC(8,2)
    await pool.query(`
      ALTER TABLE users
        ALTER COLUMN credits_balance TYPE NUMERIC(8,2) USING credits_balance::NUMERIC(8,2)
    `).catch(() => {});
    await pool.query(`
      ALTER TABLE generations
        ALTER COLUMN credits_used TYPE NUMERIC(8,2) USING credits_used::NUMERIC(8,2)
    `).catch(() => {});
    await pool.query(`
      ALTER TABLE credit_transactions
        ALTER COLUMN amount TYPE NUMERIC(8,2) USING amount::NUMERIC(8,2)
    `).catch(() => {});

    databaseState = { initialized: true, provider: 'postgresql' };
    console.log('[db] PostgreSQL connesso e schema verificato');
  } catch (error) {
    console.error('[db] Errore connessione PostgreSQL:', error.message);
    databaseState = { initialized: false, provider: null };
  }

  return databaseState;
}

function getPool() {
  return pool;
}

function getDatabaseState() {
  return { ...databaseState };
}

module.exports = {
  initializeDatabase,
  getPool,
  getDatabaseState,
};
