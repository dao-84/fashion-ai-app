const path = require('path');

const MAX_IMAGE_URL_LENGTH = 2048;
const MAX_BASE64_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_FIELD_LENGTH = 2000;

function sanitizeFilename(name) {
  if (typeof name !== 'string') {
    throw new Error('Invalid filename');
  }

  const trimmed = name.trim();
  const baseName = path.basename(trimmed);

  if (!baseName || baseName === '.' || baseName === '..') {
    throw new Error('Invalid filename');
  }

  if (baseName.startsWith('.')) {
    throw new Error('Invalid filename');
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(baseName)) {
    throw new Error('Invalid filename');
  }

  return baseName;
}

function resolveGeneratedFilePath(generatedDir, filename) {
  const safeName = sanitizeFilename(filename);
  const basePath = path.resolve(generatedDir);
  const fullPath = path.resolve(basePath, safeName);

  if (fullPath !== path.join(basePath, safeName)) {
    throw new Error('Invalid file path');
  }

  if (fullPath !== basePath && !fullPath.startsWith(`${basePath}${path.sep}`)) {
    throw new Error('Invalid file path');
  }

  return fullPath;
}

function isPrivateIpv4(hostname) {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return false;
  const parts = hostname.split('.').map((part) => Number(part));
  if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;

  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 0) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  return false;
}

function isPrivateIpv6(hostname) {
  const normalized = hostname.toLowerCase();
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  );
}

function isAllowedImageUrl(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_IMAGE_URL_LENGTH) return false;

  let url;
  try {
    url = new URL(trimmed);
  } catch (_error) {
    return false;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  const hostname = url.hostname.toLowerCase();
  if (!hostname) return false;
  if (hostname === 'localhost') return false;
  if (isPrivateIpv4(hostname)) return false;
  if (isPrivateIpv6(hostname)) return false;

  return true;
}

function getBase64Payload(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/]+={0,2})$/i);
  if (!match) return null;
  return match[2];
}

function isAllowedBase64Image(value) {
  const payload = getBase64Payload(value);
  if (!payload) return false;
  if (payload.length % 4 !== 0) return false;

  try {
    const normalized = Buffer.from(payload, 'base64').toString('base64');
    return normalized.replace(/=+$/, '') === payload.replace(/=+$/, '');
  } catch (_error) {
    return false;
  }
}

function estimateBase64Bytes(value) {
  const payload = getBase64Payload(value);
  if (!payload || payload.length % 4 !== 0) return Infinity;

  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  const size = Math.floor((payload.length * 3) / 4) - padding;
  return Number.isFinite(size) && size >= 0 ? size : Infinity;
}

module.exports = {
  MAX_IMAGE_URL_LENGTH,
  MAX_BASE64_IMAGE_BYTES,
  MAX_TEXT_FIELD_LENGTH,
  sanitizeFilename,
  resolveGeneratedFilePath,
  isAllowedImageUrl,
  isAllowedBase64Image,
  estimateBase64Bytes,
};
