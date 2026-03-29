const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { FREE_CREDITS_ON_REGISTER } = require('../config/constants');

const SALT_ROUNDS = 10;

function createAuthService(deps) {
  const { getPool, JWT_SECRET } = deps;

  function generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, plan: user.plan, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  return {
    async registerUser({ email, password } = {}) {
      if (!email || !password) {
        const err = new Error('Email e password sono obbligatorie.');
        err.status = 400;
        throw err;
      }
      if (password.length < 6) {
        const err = new Error('La password deve essere di almeno 6 caratteri.');
        err.status = 400;
        throw err;
      }

      const pool = getPool();
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existing.rows.length > 0) {
        const err = new Error('Email già registrata.');
        err.status = 409;
        throw err;
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, plan, credits_balance)
         VALUES ($1, $2, 'free', $3)
         RETURNING id, email, plan, role, credits_balance, created_at`,
        [email.toLowerCase(), passwordHash, FREE_CREDITS_ON_REGISTER]
      );

      const user = result.rows[0];
      const token = generateToken(user);
      return { token, user };
    },

    async loginUser({ email, password } = {}) {
      if (!email || !password) {
        const err = new Error('Email e password sono obbligatorie.');
        err.status = 400;
        throw err;
      }

      const pool = getPool();
      const result = await pool.query(
        'SELECT id, email, password_hash, plan, role, credits_balance FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        const err = new Error('Credenziali non valide.');
        err.status = 401;
        throw err;
      }

      const user = result.rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        const err = new Error('Credenziali non valide.');
        err.status = 401;
        throw err;
      }

      const token = generateToken(user);
      return { token, user: { id: user.id, email: user.email, plan: user.plan, role: user.role, credits_balance: user.credits_balance } };
    },

    async verifySession({ token } = {}) {
      if (!token) return { isValid: false, user: null };
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { isValid: true, user: decoded };
      } catch (_err) {
        return { isValid: false, user: null };
      }
    },

    async getProfile({ userId } = {}) {
      const pool = getPool();
      const result = await pool.query(
        'SELECT id, email, plan, role, credits_balance, created_at FROM users WHERE id = $1',
        [userId]
      );
      if (result.rows.length === 0) {
        const err = new Error('Utente non trovato.');
        err.status = 404;
        throw err;
      }
      return result.rows[0];
    },

    async changePassword({ userId, currentPassword, newPassword } = {}) {
      if (!currentPassword || !newPassword) {
        const err = new Error('Password attuale e nuova password sono obbligatorie.');
        err.status = 400;
        throw err;
      }
      if (newPassword.length < 6) {
        const err = new Error('La nuova password deve essere di almeno 6 caratteri.');
        err.status = 400;
        throw err;
      }

      const pool = getPool();
      const result = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );
      if (result.rows.length === 0) {
        const err = new Error('Utente non trovato.');
        err.status = 404;
        throw err;
      }

      const match = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
      if (!match) {
        const err = new Error('Password attuale non corretta.');
        err.status = 401;
        throw err;
      }

      const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);
    },
  };
}

module.exports = { createAuthService };
