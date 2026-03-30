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

    // Migrazione: aggiungi colonna reset crediti se non esiste
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS credits_reset_at TIMESTAMP DEFAULT NOW()
    `).catch(() => {});

    // Migrazione: aggiungi colonne watermark se non esistono
    await pool.query(`
      ALTER TABLE generations ADD COLUMN IF NOT EXISTS asset_url_clean TEXT
    `).catch(() => {});
    await pool.query(`
      ALTER TABLE generations ADD COLUMN IF NOT EXISTS watermark_removed BOOLEAN DEFAULT FALSE
    `).catch(() => {});

    // Migrazione: aggiungi colonne AutoCopy se non esistono
    await pool.query(`
      ALTER TABLE generations ADD COLUMN IF NOT EXISTS autocopy_result JSONB
    `).catch(() => {});
    await pool.query(`
      ALTER TABLE generations ADD COLUMN IF NOT EXISTS autocopy_style VARCHAR(50)
    `).catch(() => {});
    await pool.query(`
      ALTER TABLE generations ADD COLUMN IF NOT EXISTS autocopy_language VARCHAR(10)
    `).catch(() => {});

    // Migrazione: aggiungi colonne Stripe se non esistono
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100)
    `).catch(() => {});
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100)
    `).catch(() => {});

    // Migrazione: sistema crediti a due colonne (credits_plan + credits_pack)
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS credits_plan NUMERIC(8,2) DEFAULT 3
    `).catch(() => {});
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS credits_pack NUMERIC(8,2) DEFAULT 0
    `).catch(() => {});
    // Copia i crediti esistenti in credits_plan se la colonna era vuota
    await pool.query(`
      UPDATE users SET credits_plan = credits_balance WHERE credits_plan = 3 AND credits_balance != 3
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
