// Minimal helper to sanitise filenames.
function sanitizeFilename(title, ext = 'jpg') {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'look';
  return `${base}-${Date.now()}.${ext}`;
}

module.exports = {
  sanitizeFilename,
};
