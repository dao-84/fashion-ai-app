const { PLANS } = require('../config/constants');

function createCreditService(deps) {
  const { getPool } = deps;

  return {
    // Restituisce saldo e piano dell'utente
    async getUserCredits({ userId }) {
      const pool = getPool();
      const result = await pool.query(
        'SELECT credits_balance, plan FROM users WHERE id = $1',
        [userId]
      );
      if (!result.rows.length) throw new Error('Utente non trovato');
      return {
        balance: parseFloat(result.rows[0].credits_balance),
        plan: result.rows[0].plan,
      };
    },

    // Restituisce le regole del piano (risoluzioni, costi, ecc.)
    getPlanRules({ plan }) {
      return PLANS[plan] || PLANS['free'];
    },

    // Scala i crediti dopo una generazione
    async consumeCredits({ userId, amount, description }) {
      const pool = getPool();

      // Controlla saldo
      const result = await pool.query(
        'SELECT credits_balance FROM users WHERE id = $1',
        [userId]
      );
      if (!result.rows.length) {
        const err = new Error('Utente non trovato'); err.status = 404; throw err;
      }
      const balance = parseFloat(result.rows[0].credits_balance);
      if (balance < amount) {
        const err = new Error('Crediti insufficienti'); err.status = 402; throw err;
      }

      // Scala i crediti
      await pool.query(
        'UPDATE users SET credits_balance = credits_balance - $1, updated_at = NOW() WHERE id = $2',
        [amount, userId]
      );

      // Registra la transazione
      await pool.query(
        'INSERT INTO credit_transactions (user_id, amount, type, description) VALUES ($1, $2, $3, $4)',
        [userId, -amount, 'consume', description || 'Generazione']
      );
    },

    // Aggiunge crediti (al login, acquisto pacchetto, ecc.)
    async addCredits({ userId, amount, type, description }) {
      const pool = getPool();

      // Aggiunge i crediti
      await pool.query(
        'UPDATE users SET credits_balance = credits_balance + $1, updated_at = NOW() WHERE id = $2',
        [amount, userId]
      );

      // Registra la transazione
      await pool.query(
        'INSERT INTO credit_transactions (user_id, amount, type, description) VALUES ($1, $2, $3, $4)',
        [userId, amount, type || 'add', description || 'Aggiunta crediti']
      );
    },
  };
}

module.exports = {
  createCreditService,
};
