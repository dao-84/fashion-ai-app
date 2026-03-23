// Lightweight Express server to serve the static site and proxy API calls to external AI models.
// Copy .env.example to .env and set REPLICATE_API_TOKEN before running.

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Replicate = require('replicate');
const { registerRoutes } = require('./routes');
const { env, rootDir } = require('./config/env');
const { initializeDatabase } = require('./db/connection');
const { registerPublicStatic } = require('./middleware/public-static');
const { attachOptionalUser } = require('./middleware/auth.middleware');
const { notFoundHandler } = require('./middleware/notFound.middleware');
const { errorHandler } = require('./middleware/error.middleware');
const { createReplicateIntegration } = require('./integrations/ai/replicate.integration');
const { MAX_BASE64_IMAGE_BYTES } = require('./utils/security.utils');

const fetch = (...args) =>
  import('node-fetch').then(({ default: fetchImpl }) => fetchImpl(...args));

const app = express();
const {
  PORT,
  REPLICATE_API_TOKEN,
  REPLICATE_MODEL_VERSION,
  REPLICATE_MODEL_VERSION_IDENTITY,
  DEFAULT_MODEL_BASE_PROMPT,
  BETA_TOKEN,
  ALLOWED_ORIGINS,
} = env;

const replicate = REPLICATE_API_TOKEN
  ? new Replicate({ auth: REPLICATE_API_TOKEN })
  : null;

const logEmoji = {
  startup: '[startup]',
  generate: '[generate]',
  save: '[save]',
  warn: '[warn]',
  error: '[error]',
  auth: '[auth]',
};

const log = {
  info: (emoji, message) => console.log(`${emoji} ${message}`),
  warn: (emoji, message) => console.warn(`${emoji} ${message}`),
  error: (emoji, message, err) => console.error(`${emoji} ${message}`, err ?? ''),
};

function safeLog(message) {
  return message
    .replace(/Bearer\s+[A-Za-z0-9\-_\.]+/g, 'Bearer ***')
    .replace(/api_key=[^&\s]+/g, 'api_key=***');
}

const publicDir = rootDir;
const storageDir = path.join(rootDir, 'storage');
const generatedDir = path.join(storageDir, 'generated');
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true });
  log.info(logEmoji.startup, `created output dir: ${generatedDir}`);
}
const galleryDir = generatedDir;

initializeDatabase().catch((error) => {
  console.warn('[startup] Database initialization skipped or failed:', error?.message || error);
});

function logProvider() {
  if (replicate) {
    log.info(logEmoji.startup, 'Replicate ai blocchi di partenza');
  } else {
    log.warn(logEmoji.warn, 'Nessun motore AI configurato: aggiungi REPLICATE_API_TOKEN in .env');
  }

  if (BETA_TOKEN) {
    log.info(logEmoji.auth, 'Beta guard ATTIVO - accesso API protetto da token');
  } else {
    log.warn(logEmoji.warn, 'Beta guard DISATTIVO - imposta BETA_TOKEN in .env per proteggere la beta');
  }
}

const allowedOrigins = ALLOWED_ORIGINS && ALLOWED_ORIGINS.length
  ? ALLOWED_ORIGINS
  : [];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      log.warn(logEmoji.warn, `[cors] blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'DELETE'],
  })
);

// Slightly above the 8 MB decoded-image limit to account for base64 overhead.
app.use(express.json({ limit: `${Math.ceil((MAX_BASE64_IMAGE_BYTES * 1.5) / (1024 * 1024))}mb` }));
app.use(attachOptionalUser);

function betaGuard(req, res, next) {
  if (!BETA_TOKEN) return next();
  if (!req.path.startsWith('/api/')) return next();

  const authHeader = req.headers.authorization || '';

  if (authHeader === `Bearer ${BETA_TOKEN}`) {
    return next();
  }

  log.warn(logEmoji.auth, safeLog(`[beta-guard] denied IP:${req.ip} path:${req.path}`));
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use(betaGuard);

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const mediumLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const softLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/generate', strictLimiter);
app.use('/api/generate-model', strictLimiter);

app.use('/api/publish', mediumLimiter);
app.use('/api/gallery', mediumLimiter);

app.use('/api', softLimiter);

const replicateIntegration = createReplicateIntegration({ replicate });

registerPublicStatic(app, {
  rootDir,
  galleryDir,
  fs,
});

registerRoutes(app, {
  log,
  logEmoji,
  galleryDir,
  fs,
  path,
  DEFAULT_MODEL_BASE_PROMPT,
  REPLICATE_MODEL_VERSION_IDENTITY,
  REPLICATE_MODEL_VERSION,
  fetch,
  publicDir,
  replicateIntegration,
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = {
  app,
  PORT,
  log,
  logEmoji,
  logProvider,
};
