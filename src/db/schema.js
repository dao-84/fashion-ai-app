const CREATE_USERS = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    plan VARCHAR(50) DEFAULT 'free',
    credits_balance NUMERIC(8,2) DEFAULT 12,
    credits_reset_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
`;

const CREATE_GENERATIONS = `
  CREATE TABLE IF NOT EXISTS generations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    prompt TEXT,
    asset_url TEXT,
    asset_url_clean TEXT,
    watermark_removed BOOLEAN DEFAULT FALSE,
    provider VARCHAR(50),
    resolution VARCHAR(10),
    garment_type VARCHAR(50),
    style VARCHAR(50),
    credits_used NUMERIC(8,2) DEFAULT 1,
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT NOW()
  );
`;

const CREATE_CREDIT_TRANSACTIONS = `
  CREATE TABLE IF NOT EXISTS credit_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(8,2) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
`;

module.exports = {
  CREATE_USERS,
  CREATE_GENERATIONS,
  CREATE_CREDIT_TRANSACTIONS,
};
