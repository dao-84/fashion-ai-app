function sanitizeTextField(value, options = {}) {
  const { collapseWhitespace = false, maxLength } = options;

  if (value === undefined || value === null || typeof value !== 'string') {
    throw new Error('Invalid request payload');
  }

  let sanitized = value.trim();
  if (collapseWhitespace) {
    sanitized = sanitized.replace(/\s+/g, ' ');
  }

  if (!sanitized) {
    throw new Error('Invalid request payload');
  }

  if (typeof maxLength === 'number' && sanitized.length > maxLength) {
    throw new Error('Input too large');
  }

  return sanitized;
}

function sanitizeOptionalTextField(value, options = {}) {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new Error('Invalid request payload');
  }

  let sanitized = value.trim();
  if (options.collapseWhitespace) {
    sanitized = sanitized.replace(/\s+/g, ' ');
  }

  if (!sanitized) {
    return '';
  }

  if (typeof options.maxLength === 'number' && sanitized.length > options.maxLength) {
    throw new Error('Input too large');
  }

  return sanitized;
}

module.exports = {
  sanitizeTextField,
  sanitizeOptionalTextField,
};
