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
const { initializeDatabase } = require('./db/connection');
const { registerPublicStatic } = require('./middleware/public-static');
const { attachOptionalUser } = require('./middleware/auth.middleware');
const { notFoundHandler } = require('./middleware/notFound.middleware');
const { errorHandler } = require('./middleware/error.middleware');
const { createOpenAIIntegration } = require('./integrations/ai/openai.integration');
const { createReplicateIntegration } = require('./integrations/ai/replicate.integration');
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
  REPLICATE_UPSCALE_MODEL_VERSION,
  REPLICATE_REFINER_MODEL_VERSION,
  OPENAI_API_KEY,
  OPENAI_MODEL,
  OPENAI_IMAGE_MODEL,
  GOOGLE_API_KEY,
  GEMINI_IMAGE_MODEL,
  DEFAULT_MODEL_BASE_PROMPT,
  BETA_TOKEN,
  ALLOWED_ORIGINS,
} = env;

const replicate = REPLICATE_API_TOKEN
  ? new Replicate({ auth: REPLICATE_API_TOKEN })
  : null;
const openai = OPENAI_API_KEY && OpenAI ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

const logEmoji = {
  openaiImage: '🖼️',
  gemini: '🔮',
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

const PUBLIC_API_PATHS = [
  '/api/track-event',
];

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

  if (openai) {
    log.info(logEmoji.openai, `[startup] OpenAI pronto (model: ${OPENAI_MODEL})`);
  } else {
    log.warn(logEmoji.warn, '[startup] OpenAI non configurato: aggiungi OPENAI_API_KEY in .env per generare prompt');
  }

  if (GOOGLE_API_KEY) {
    log.info(logEmoji.gemini, `[startup] Gemini pronto (model: ${GEMINI_IMAGE_MODEL})`);
  } else {
    log.warn(logEmoji.warn, '[startup] Gemini non configurato: aggiungi GOOGLE_API_KEY in .env per generare immagini con Imagen');
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

function isPublicPath(pathname) {
  return PUBLIC_API_PATHS.some((publicPath) => pathname.startsWith(publicPath));
}

function betaGuard(req, res, next) {
  if (!BETA_TOKEN) return next();
  if (!req.path.startsWith('/api/')) return next();
  if (isPublicPath(req.path)) return next();

  const authHeader = req.headers.authorization || '';
  const queryToken = req.query?.token || '';

  if (authHeader === `Bearer ${BETA_TOKEN}` || queryToken === BETA_TOKEN) {
    return next();
  }

  log.warn(logEmoji.auth, `[beta-guard] accesso negato - IP: ${req.ip} - path: ${req.path}`);
  return res.status(401).json({ error: 'Accesso beta non autorizzato.' });
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
  REPLICATE_UPSCALE_MODEL_VERSION,
  REPLICATE_REFINER_MODEL_VERSION,
  publicDir,
  openaiIntegration,
  replicateIntegration,
  proxyIntegration,
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
