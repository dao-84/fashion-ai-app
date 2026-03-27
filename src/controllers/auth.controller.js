function createAuthController(deps) {
  const { authService } = deps;

  return {
    register: async (req, res) => {
      try {
        const { email, password } = req.body || {};
        const result = await authService.registerUser({ email, password });
        return res.status(201).json(result);
      } catch (error) {
        return res.status(error.status || 500).json({ error: error.message });
      }
    },

    login: async (req, res) => {
      try {
        const { email, password } = req.body || {};
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
        return res.status(200).json({ user });
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    },
  };
}

module.exports = { createAuthController };
