// Lightweight Express server to serve the static site and proxy API calls to external AI models.
// Copy .env.example to .env and set API_BASE_URL / API_KEY or REPLICATE_API_TOKEN before running.

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Replicate = require('replicate');
const { registerRoutes } = require('./routes');
const { env, rootDir } = require('./config/env');
const { initializeDatabase, getPool } = require('./db/connection');
const { registerPublicStatic } = require('./middleware/public-static');
const { attachOptionalUser } = require('./middleware/auth.middleware');
const { notFoundHandler } = require('./middleware/notFound.middleware');
const { errorHandler } = require('./middleware/error.middleware');
const { createOpenAIIntegration } = require('./integrations/ai/openai.integration');
const { createReplicateIntegration } = require('./integrations/ai/replicate.integration');
const { createFalIntegration } = require('./integrations/ai/fal.integration');
const { createGoogleIntegration } = require('./integrations/ai/google.integration');
const { createProxyIntegration } = require('./integrations/ai/proxy.integration');

let OpenAI;
try {
  OpenAI = require('openai');
} catch (err) {
  console.warn('[startup] OpenAI SDK non installato. Esegui: npm install openai');
}

const fetch = (...args) =>
  import('node-fetch').then(({ default: fetchImpl }) => fetchImpl(...args));

const app = express();
app.set('trust proxy', 1);
const {
  PORT,
  API_BASE_URL,
  API_KEY,
  REPLICATE_API_TOKEN,
  REPLICATE_MODEL_VERSION,
  REPLICATE_MODEL_VERSION_IDENTITY,
  FAL_KEY,
  GOOGLE_AI_KEY,
  OPENAI_API_KEY,
  OPENAI_MODEL,
  OPENAI_IMAGE_MODEL,
  DEFAULT_MODEL_BASE_PROMPT,
  BETA_TOKEN,
  ALLOWED_ORIGINS,
  JWT_SECRET,
} = env;

const replicate = REPLICATE_API_TOKEN
  ? new Replicate({ auth: REPLICATE_API_TOKEN })
  : null;
const openai = OPENAI_API_KEY && OpenAI ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

const logEmoji = {
  openaiImage: '🖼️',
  startup: '🚀',
  proxy: '🛰️',
  generate: '🎨',
  save: '💾',
  warn: '⚠️',
  error: '❌',
  openai: '✨',
  auth: '🔐',
};

const log = {
  info: (emoji, message) => console.log(`${emoji} ${message}`),
  warn: (emoji, message) => console.warn(`${emoji} ${message}`),
  error: (emoji, message, err) => console.error(`${emoji} ${message}`, err ?? ''),
};

const publicDir = rootDir;
const storageDir = path.join(rootDir, 'storage');
const generatedDir = path.join(storageDir, 'generated');
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true });
  log.info(logEmoji.startup, `[startup] created output dir: ${generatedDir}`);
}
const galleryDir = generatedDir;

initializeDatabase().catch((error) => {
  console.warn('[startup] Database initialization skipped or failed:', error?.message || error);
});

function logProvider() {
  if (replicate) {
    log.info(logEmoji.startup, '[startup] Replicate ai blocchi di partenza');
  } else if (API_BASE_URL && API_KEY) {
    log.info(logEmoji.proxy, `[startup] Modalita proxy legacy attiva su ${API_BASE_URL}`);
  } else {
    log.warn(logEmoji.warn, '[startup] Nessun motore AI configurato: aggiungi REPLICATE_API_TOKEN oppure API_BASE_URL/API_KEY in .env');
  }

  if (falIntegration.isConfigured()) {
    log.info(logEmoji.generate, '[startup] FAL.AI pronto (model: fal-ai/nano-banana-2/edit)');
  } else {
    log.warn(logEmoji.warn, '[startup] FAL.AI non configurato: aggiungi FAL_KEY in .env per usare FAL.AI');
  }

  if (googleIntegration.isConfigured()) {
    log.info(logEmoji.generate, '[startup] Google AI pronto (model: gemini-3.1-flash-image-preview)');
  } else {
    log.warn(logEmoji.warn, '[startup] Google AI non configurato: aggiungi GOOGLE_AI_KEY in .env per usare Google');
  }

  if (openai) {
    log.info(logEmoji.openai, `[startup] OpenAI pronto (model: ${OPENAI_MODEL})`);
  } else {
    log.warn(logEmoji.warn, '[startup] OpenAI non configurato: aggiungi OPENAI_API_KEY in .env per generare prompt');
  }

  if (OPENAI_API_KEY) {
    log.info(logEmoji.openaiImage, `[startup] OpenAI Images pronto (model: ${OPENAI_IMAGE_MODEL})`);
  }

  if (BETA_TOKEN) {
    log.info(logEmoji.auth, '[startup] Beta guard ATTIVO - accesso API protetto da token');
  } else {
    log.warn(logEmoji.warn, '[startup] Beta guard DISATTIVO - imposta BETA_TOKEN in .env per proteggere la beta');
  }
}

app.use(
  cors({
    origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : '*',
    methods: ['GET', 'POST', 'DELETE'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(attachOptionalUser);

function betaGuard(req, res, next) {
  if (!req.path.startsWith('/api/')) return next();

  // Le route di autenticazione sono sempre pubbliche
  if (req.path.startsWith('/api/auth/')) return next();

  // Con auth attivo: accetta JWT valido (già verificato da attachOptionalUser)
  const { features } = require('./config/features');
  if (features.enableAuth && req.auth?.isAuthenticated) return next();

  // Fallback: beta token classico
  if (!BETA_TOKEN) return next();
  const authHeader = req.headers.authorization || '';
  const queryToken = req.query?.token || '';
  if (authHeader === `Bearer ${BETA_TOKEN}` || queryToken === BETA_TOKEN) return next();

  log.warn(logEmoji.auth, `[beta-guard] accesso negato - IP: ${req.ip} - path: ${req.path}`);
  return res.status(401).json({ error: 'Accesso richiede autenticazione.' });
}

app.use(betaGuard);

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

const openaiIntegration = createOpenAIIntegration({
  openai,
  OPENAI_MODEL,
});
const replicateIntegration = createReplicateIntegration({ replicate });
const falIntegration = createFalIntegration({ FAL_KEY });
const googleIntegration = createGoogleIntegration({ GOOGLE_AI_KEY });
const proxyIntegration = createProxyIntegration({
  fetch,
  API_BASE_URL,
  API_KEY,
});

registerPublicStatic(app, {
  rootDir,
  galleryDir,
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
  openaiIntegration,
  replicateIntegration,
  falIntegration,
  googleIntegration,
  proxyIntegration,
  getPool,
  JWT_SECRET,
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
