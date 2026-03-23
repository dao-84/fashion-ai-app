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
  REPLICATE_API_TOKEN: readString('REPLICATE_API_TOKEN'),
  REPLICATE_MODEL_VERSION: readString('REPLICATE_MODEL_VERSION', DEFAULTS.replicateModelVersion),
  REPLICATE_MODEL_VERSION_IDENTITY: readString(
    'REPLICATE_MODEL_VERSION_IDENTITY',
    DEFAULTS.replicateModelVersionIdentity
  ),
  BETA_TOKEN: readString('BETA_TOKEN'),
  PUBLIC_BASE_URL: readString('PUBLIC_BASE_URL'),
  ALLOWED_ORIGINS: readCsv('ALLOWED_ORIGINS'),
  DEFAULT_MODEL_BASE_PROMPT,
};

if (!env.PUBLIC_BASE_URL) {
  env.PUBLIC_BASE_URL = `http://localhost:${env.PORT}`;
}

module.exports = {
  env,
  rootDir,
};
