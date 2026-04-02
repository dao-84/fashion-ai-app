const express = require('express');
const { createAuthService } = require('../services/auth.service');
const { createAuthController } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { createCreditService } = require('../services/credit.service');
const { createResendIntegration } = require('../integrations/email/resend.integration');

function registerAuthRoutes(app, deps) {
  const creditService = createCreditService({ getPool: deps.getPool });
  const emailService = createResendIntegration({ apiKey: deps.env?.RESEND_API_KEY });
  const authService = createAuthService({
    getPool: deps.getPool,
    JWT_SECRET: deps.JWT_SECRET,
    creditService,
    emailService,
    frontendUrl: deps.env?.FRONTEND_URL,
  });
  const authController = createAuthController({ authService });

  const router = express.Router();
  router.post('/register', authController.register);
  router.post('/login', authController.login);
  router.get('/me', authController.me);
  router.get('/profile', requireAuth, authController.profile);
  router.post('/change-password', requireAuth, authController.changePassword);
  router.get('/verify-email/:token', authController.verifyEmail);

  app.use('/api/auth', router);
}

module.exports = { registerAuthRoutes };
