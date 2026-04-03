const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { FREE_CREDITS_ON_REGISTER } = require('../config/constants');

const SALT_ROUNDS = 12;

function createAuthService(deps) {
  const { getPool, JWT_SECRET, creditService, emailService, frontendUrl } = deps;

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
      const verificationToken = crypto.randomBytes(32).toString('hex');

      const result = await pool.query(
        `INSERT INTO users (email, password_hash, plan, credits_plan, credits_pack, email_verified, verification_token)
         VALUES ($1, $2, 'free', $3, 0, FALSE, $4)
         RETURNING id, email, plan, role, credits_plan, credits_pack, created_at`,
        [email.toLowerCase(), passwordHash, FREE_CREDITS_ON_REGISTER, verificationToken]
      );

      const user = result.rows[0];

      // Invia email di verifica
      if (emailService && emailService.isConfigured()) {
        const baseUrl = (frontendUrl || 'https://shotless.ai').replace(/\/$/, '');
        const verificationUrl = `${baseUrl}/verify-email.html?token=${verificationToken}`;
        await emailService.sendVerificationEmail({ to: user.email, verificationUrl });
      }

      return { emailSent: true };
    },

    async loginUser({ email, password } = {}) {
      if (!email || !password) {
        const err = new Error('Email e password sono obbligatorie.');
        err.status = 400;
        throw err;
      }

      const pool = getPool();
      const result = await pool.query(
        'SELECT id, email, password_hash, plan, role, credits_plan, credits_pack, email_verified FROM users WHERE email = $1',
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

      if (!user.email_verified) {
        const err = new Error('Conferma la tua email prima di accedere. Controlla la tua casella di posta.');
        err.status = 403;
        err.code = 'EMAIL_NOT_VERIFIED';
        throw err;
      }

      // Controlla e resetta i crediti se sono passati 30 giorni
      if (creditService) {
        await creditService.checkAndResetCredits({ userId: user.id, plan: user.plan }).catch(() => {});
      }

      // Rileggi il saldo aggiornato dopo eventuale reset
      const refreshed = await pool.query(
        'SELECT credits_plan, credits_pack FROM users WHERE id = $1',
        [user.id]
      );
      const credits_plan = parseFloat(refreshed.rows[0]?.credits_plan ?? user.credits_plan);
      const credits_pack = parseFloat(refreshed.rows[0]?.credits_pack ?? user.credits_pack);
      const credits_balance = credits_plan + credits_pack;

      const token = generateToken(user);
      return { token, user: { id: user.id, email: user.email, plan: user.plan, role: user.role, credits_balance } };
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
        'SELECT id, email, plan, role, credits_plan, credits_pack, created_at FROM users WHERE id = $1',
        [userId]
      );
      if (result.rows.length === 0) {
        const err = new Error('Utente non trovato.');
        err.status = 404;
        throw err;
      }
      const row = result.rows[0];
      row.credits_balance = parseFloat(row.credits_plan) + parseFloat(row.credits_pack);
      return row;
    },

    async verifyEmail({ token } = {}) {
      if (!token) {
        const err = new Error('Token mancante.');
        err.status = 400;
        throw err;
      }
      const pool = getPool();
      const result = await pool.query(
        'SELECT id FROM users WHERE verification_token = $1 AND email_verified = FALSE',
        [token]
      );
      if (!result.rows.length) {
        const err = new Error('Token non valido o già utilizzato.');
        err.status = 400;
        throw err;
      }
      const userId = result.rows[0].id;
      await pool.query(
        'UPDATE users SET email_verified = TRUE, verification_token = NULL WHERE id = $1',
        [userId]
      );

      // Rilascia token JWT per login automatico
      const userRow = await pool.query(
        'SELECT id, email, plan, role, credits_plan, credits_pack FROM users WHERE id = $1',
        [userId]
      );
      const user = userRow.rows[0];
      user.credits_balance = parseFloat(user.credits_plan) + parseFloat(user.credits_pack);
      const jwtToken = generateToken(user);
      return { ok: true, token: jwtToken, user: { id: user.id, email: user.email, plan: user.plan, role: user.role, credits_balance: user.credits_balance } };
    },

    async requestPasswordReset({ email } = {}) {
      if (!email) {
        const err = new Error('Email obbligatoria.');
        err.status = 400;
        throw err;
      }
      const pool = getPool();
      const result = await pool.query(
        'SELECT id, email FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      // Risposta sempre positiva per non rivelare se l'email esiste
      if (!result.rows.length) return { ok: true };

      const user = result.rows[0];
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 ora

      await pool.query(
        'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
        [resetToken, expiresAt, user.id]
      );

      if (emailService && emailService.isConfigured()) {
        const baseUrl = (frontendUrl || 'https://shotless.ai').replace(/\/$/, '');
        const resetUrl = `${baseUrl}/reset-password.html?token=${resetToken}`;
        await emailService.sendPasswordResetEmail({ to: user.email, resetUrl });
      }

      return { ok: true };
    },

    async resetPassword({ token, newPassword } = {}) {
      if (!token || !newPassword) {
        const err = new Error('Token e nuova password sono obbligatori.');
        err.status = 400;
        throw err;
      }
      if (newPassword.length < 6) {
        const err = new Error('La password deve essere di almeno 6 caratteri.');
        err.status = 400;
        throw err;
      }
      const pool = getPool();
      const result = await pool.query(
        'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
        [token]
      );
      if (!result.rows.length) {
        const err = new Error('Link non valido o scaduto. Richiedi un nuovo link.');
        err.status = 400;
        throw err;
      }
      const userId = result.rows[0].id;
      const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await pool.query(
        'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() WHERE id = $2',
        [newHash, userId]
      );
      return { ok: true };
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
