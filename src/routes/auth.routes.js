const express = require('express');
const { createAuthService } = require('../services/auth.service');
const { createAuthController } = require('../controllers/auth.controller');

function registerAuthRoutes(app, deps) {
  const authService = createAuthService({
    getPool: deps.getPool,
    JWT_SECRET: deps.JWT_SECRET,
  });
  const authController = createAuthController({ authService });

  const router = express.Router();
  router.post('/register', authController.register);
  router.post('/login', authController.login);
  router.get('/me', authController.me);

  app.use('/api/auth', router);
}

module.exports = { registerAuthRoutes };
