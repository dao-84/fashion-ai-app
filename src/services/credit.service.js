const { PLANS } = require('../config/constants');

function createCreditService(deps) {
  const { getPool } = deps;

  return {
    // Restituisce saldo e piano dell'utente
    async getUserCredits({ userId }) {
      const pool = getPool();
      const result = await pool.query(
        'SELECT credits_plan, credits_pack, plan FROM users WHERE id = $1',
        [userId]
      );
      if (!result.rows.length) throw new Error('Utente non trovato');
      const row = result.rows[0];
      return {
        balance: parseFloat(row.credits_plan) + parseFloat(row.credits_pack),
        credits_plan: parseFloat(row.credits_plan),
        credits_pack: parseFloat(row.credits_pack),
        plan: row.plan,
      };
    },

    // Restituisce le regole del piano (risoluzioni, costi, ecc.)
    getPlanRules({ plan }) {
      return PLANS[plan] || PLANS['free'];
    },

    // Scala i crediti dopo una generazione — consuma prima i crediti pack, poi quelli piano
    async consumeCredits({ userId, amount, description }) {
      const pool = getPool();
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // FOR UPDATE blocca la riga — impedisce race condition su richieste simultanee
        const result = await client.query(
          'SELECT credits_plan, credits_pack FROM users WHERE id = $1 FOR UPDATE',
          [userId]
        );
        if (!result.rows.length) {
          const err = new Error('Utente non trovato'); err.status = 404; throw err;
        }
        const plan_bal = parseFloat(result.rows[0].credits_plan);
        const pack_bal = parseFloat(result.rows[0].credits_pack);
        const total = plan_bal + pack_bal;

        if (total < amount) {
          const err = new Error('Crediti insufficienti'); err.status = 402; throw err;
        }

        // Consuma prima dal pack, poi dal piano
        let fromPack = Math.min(pack_bal, amount);
        let fromPlan = amount - fromPack;

        await client.query(
          'UPDATE users SET credits_pack = credits_pack - $1, credits_plan = credits_plan - $2, updated_at = NOW() WHERE id = $3',
          [fromPack, fromPlan, userId]
        );

        // Registra la transazione
        await client.query(
          'INSERT INTO credit_transactions (user_id, amount, type, description) VALUES ($1, $2, $3, $4)',
          [userId, -amount, 'consume', description || 'Generazione']
        );

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    // Controlla se sono passati 30 giorni e resetta i soli crediti piano (pack non toccati)
    async checkAndResetCredits({ userId, plan }) {
      const planRules = PLANS[plan] || PLANS['free'];
      if (!planRules.renewMonthly) return; // Free: crediti una tantum, non si rinnovano

      const pool = getPool();
      const result = await pool.query(
        'SELECT credits_reset_at FROM users WHERE id = $1',
        [userId]
      );
      if (!result.rows.length) return;

      const lastReset = new Date(result.rows[0].credits_reset_at);
      const daysSinceReset = (Date.now() - lastReset.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceReset < 30) return; // Non ancora 30 giorni

      // Resetta solo i crediti piano al valore del piano — pack invariati
      await pool.query(
        'UPDATE users SET credits_plan = $1, credits_reset_at = NOW(), updated_at = NOW() WHERE id = $2',
        [planRules.credits, userId]
      );
      await pool.query(
        'INSERT INTO credit_transactions (user_id, amount, type, description) VALUES ($1, $2, $3, $4)',
        [userId, planRules.credits, 'reset', `Rinnovo mensile piano ${plan}`]
      );
    },

    // Aggiunge crediti piano (acquisto abbonamento — sovrascrive solo credits_plan)
    async setPlanCredits({ userId, amount, description }) {
      const pool = getPool();
      await pool.query(
        'UPDATE users SET credits_plan = $1, updated_at = NOW() WHERE id = $2',
        [amount, userId]
      );
      await pool.query(
        'INSERT INTO credit_transactions (user_id, amount, type, description) VALUES ($1, $2, $3, $4)',
        [userId, amount, 'plan', description || 'Aggiornamento piano']
      );
    },

    // Aggiunge crediti pack (acquisto one-time — si sommano a credits_pack)
    async addPackCredits({ userId, amount, description }) {
      const pool = getPool();
      await pool.query(
        'UPDATE users SET credits_pack = credits_pack + $1, updated_at = NOW() WHERE id = $2',
        [amount, userId]
      );
      await pool.query(
        'INSERT INTO credit_transactions (user_id, amount, type, description) VALUES ($1, $2, $3, $4)',
        [userId, amount, 'pack', description || 'Pacchetto crediti']
      );
    },

    // Ultime N transazioni dell'utente
    async getTransactionHistory({ userId, limit = 10 }) {
      const pool = getPool();
      const result = await pool.query(
        'SELECT amount, type, description, created_at FROM credit_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
        [userId, limit]
      );
      return result.rows;
    },

    // Rimborso crediti dopo errore provider (aggiunge a credits_plan)
    async refundCredits({ userId, amount, description }) {
      const pool = getPool();
      await pool.query(
        'UPDATE users SET credits_plan = credits_plan + $1, updated_at = NOW() WHERE id = $2',
        [amount, userId]
      );
      await pool.query(
        'INSERT INTO credit_transactions (user_id, amount, type, description) VALUES ($1, $2, $3, $4)',
        [userId, amount, 'refund', description || 'Rimborso generazione fallita']
      );
    },
  };
}

module.exports = {
  createCreditService,
};
