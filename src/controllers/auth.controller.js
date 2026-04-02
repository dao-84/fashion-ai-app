const { env } = require('../config/env');

function createAuthController(deps) {
  const { authService } = deps;

  function checkBetaToken(betaToken) {
    if (!env.BETA_TOKEN) return true;
    return betaToken === env.BETA_TOKEN;
  }

  return {
    register: async (req, res) => {
      try {
        const { email, password, betaToken } = req.body || {};
        if (!checkBetaToken(betaToken)) {
          return res.status(403).json({ error: 'Codice beta non valido.' });
        }
        const result = await authService.registerUser({ email, password });
        return res.status(201).json(result);
      } catch (error) {
        return res.status(error.status || 500).json({ error: error.message });
      }
    },

    login: async (req, res) => {
      try {
        const { email, password, betaToken } = req.body || {};
        if (!checkBetaToken(betaToken)) {
          return res.status(403).json({ error: 'Codice beta non valido.' });
        }
        const result = await authService.loginUser({ email, password });
        return res.status(200).json(result);
      } catch (error) {
        return res.status(error.status || 500).json({ error: error.message });
      }
    },

    me: async (req, res) => {
      try {
        const token = (req.headers.authorization || '').replace('Bearer ', '');
        const { isValid, user } = await authService.verifySession({ token });
        if (!isValid) return res.status(401).json({ error: 'Token non valido o scaduto.' });
        const profile = await authService.getProfile({ userId: user.id });
        return res.status(200).json({ user: profile });
      } catch (error) {
        return res.status(error.status || 500).json({ error: error.message });
      }
    },

    profile: async (req, res) => {
      try {
        const profile = await authService.getProfile({ userId: req.auth.user.id });
        return res.status(200).json({ user: profile });
      } catch (error) {
        return res.status(error.status || 500).json({ error: error.message });
      }
    },

    changePassword: async (req, res) => {
      try {
        const { currentPassword, newPassword } = req.body || {};
        await authService.changePassword({ userId: req.auth.user.id, currentPassword, newPassword });
        return res.status(200).json({ message: 'Password aggiornata con successo.' });
      } catch (error) {
        return res.status(error.status || 500).json({ error: error.message });
      }
    },

    verifyEmail: async (req, res) => {
      try {
        const { token } = req.params;
        await authService.verifyEmail({ token });
        return res.status(200).json({ ok: true });
      } catch (error) {
        return res.status(error.status || 500).json({ error: error.message });
      }
    },
  };
}

module.exports = { createAuthController };
