const jwt = require('jsonwebtoken');
const { features } = require('../config/features');
const { env } = require('../config/env');

function attachOptionalUser(req, _res, next) {
  req.auth = { user: null, isAuthenticated: false };

  if (!features.enableAuth) return next();

  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.auth = { user: decoded, isAuthenticated: true };
  } catch (_err) {
    // token non valido — procede senza utente
  }

  return next();
}

function requireAuth(req, res, next) {
  if (!features.enableAuth) return next();

  if (!req.auth?.isAuthenticated) {
    return res.status(401).json({ error: 'Accesso richiede autenticazione.' });
  }
  return next();
}

module.exports = { attachOptionalUser, requireAuth };
