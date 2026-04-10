const path = require('path');
const dotenv = require('dotenv');
const { DEFAULTS, DEFAULT_MODEL_BASE_PROMPT } = require('./constants');

const rootDir = path.join(__dirname, '..', '..');

dotenv.config({ path: path.join(rootDir, '.env') });

function readString(name, fallback = '') {
  const value = process.env[name];
  return typeof value === 'string' ? value : fallback;
}

function readNumber(name, fallback) {
  const rawValue = process.env[name];
  if (!rawValue) return fallback;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readCsv(name) {
  const value = readString(name, '');
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const env = {
  NODE_ENV: readString('NODE_ENV', 'development'),
  PORT: readNumber('PORT', DEFAULTS.port),
  API_BASE_URL: readString('API_BASE_URL'),
  API_KEY: readString('API_KEY'),
  REPLICATE_API_TOKEN: readString('REPLICATE_API_TOKEN'),
  REPLICATE_MODEL_VERSION: readString('REPLICATE_MODEL_VERSION', DEFAULTS.replicateModelVersion),
  REPLICATE_MODEL_VERSION_IDENTITY: readString(
    'REPLICATE_MODEL_VERSION_IDENTITY',
    DEFAULTS.replicateModelVersionIdentity
  ),
  FAL_KEY: readString('FAL_KEY'),
  GOOGLE_AI_KEY: readString('GOOGLE_AI_KEY'),
  OPENAI_API_KEY: readString('OPENAI_API_KEY'),
  OPENAI_MODEL: readString('OPENAI_MODEL', DEFAULTS.openaiModel),
  OPENAI_IMAGE_MODEL: readString('OPENAI_IMAGE_MODEL', DEFAULTS.openaiImageModel),
  BETA_TOKEN: readString('BETA_TOKEN'),
  AIRTABLE_TOKEN: readString('AIRTABLE_TOKEN'),
  AIRTABLE_BASE_ID: readString('AIRTABLE_BASE_ID'),
  AIRTABLE_TABLE: readString('AIRTABLE_TABLE', 'Waitlist'),
  DATABASE_URL: readString('DATABASE_URL'),
  JWT_SECRET: readString('JWT_SECRET'),
  R2_ACCOUNT_ID: readString('R2_ACCOUNT_ID'),
  R2_ACCESS_KEY_ID: readString('R2_ACCESS_KEY_ID'),
  R2_SECRET_ACCESS_KEY: readString('R2_SECRET_ACCESS_KEY'),
  R2_BUCKET_NAME: readString('R2_BUCKET_NAME'),
  R2_PUBLIC_URL: readString('R2_PUBLIC_URL'),
  PUBLIC_BASE_URL: readString('PUBLIC_BASE_URL'),
  ALLOWED_ORIGINS: readCsv('ALLOWED_ORIGINS'),
  FRONTEND_URL: readString('FRONTEND_URL'),
  STRIPE_SECRET_KEY: readString('STRIPE_SECRET_KEY'),
  STRIPE_PUBLISHABLE_KEY: readString('STRIPE_PUBLISHABLE_KEY'),
  STRIPE_WEBHOOK_SECRET: readString('STRIPE_WEBHOOK_SECRET'),
  RESEND_API_KEY: readString('RESEND_API_KEY'),
  TELEGRAM_BOT_TOKEN: readString('TELEGRAM_BOT_TOKEN'),
  TELEGRAM_CHAT_ID: readString('TELEGRAM_CHAT_ID'),
  DEFAULT_MODEL_BASE_PROMPT,
};

if (!env.PUBLIC_BASE_URL) {
  env.PUBLIC_BASE_URL = `http://localhost:${env.PORT}`;
}

if (!env.JWT_SECRET) {
  console.error('ERRORE CRITICO: JWT_SECRET non configurato — aggiungilo al file .env');
  process.exit(1);
}

module.exports = {
  env,
  rootDir,
};
