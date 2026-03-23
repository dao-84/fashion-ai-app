const { sanitizeFilename } = require('../utils/sanitizeFilename');
const { sanitizeTextField, sanitizeOptionalTextField } = require('../utils/request-sanitizer');
const { MAX_SHORT_TEXT_LENGTH } = require('../config/constants');

function createServiceError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  if (details !== undefined) error.details = details;
  return error;
}

function createPublishService(deps) {
  const { galleryDir, fs, path, log, logEmoji } = deps;

  function sanitizePublishText(value, options = {}) {
    try {
      return sanitizeTextField(value, options);
    } catch (error) {
      throw createServiceError(400, error.message || 'Invalid request payload');
    }
  }

  function sanitizeOptionalPublishText(value, options = {}) {
    try {
      return sanitizeOptionalTextField(value, options);
    } catch (error) {
      throw createServiceError(400, error.message || 'Invalid request payload');
    }
  }

  return {
    async describe(filename, guideline, tone) {
      if (!filename) {
        throw createServiceError(400, 'Missing filename');
      }

      const sanitizedGuideline = sanitizePublishText(guideline, {
        collapseWhitespace: true,
        maxLength: MAX_SHORT_TEXT_LENGTH,
      });
      const sanitizedTone = sanitizeOptionalPublishText(tone, {
        collapseWhitespace: true,
        maxLength: MAX_SHORT_TEXT_LENGTH,
      });

      const filePath = path.join(galleryDir, filename);
      if (!fs.existsSync(filePath)) {
        throw createServiceError(404, 'File not found');
      }

      log.warn(
        logEmoji.warn,
        `[publish] describe non disponibile in build Replicate-only (${filename}, ${sanitizedGuideline || 'default'}, ${sanitizedTone || 'default'})`
      );
      throw createServiceError(501, 'Describe non disponibile: questa build supporta solo Replicate.');
    },

    rename(filename, newTitle) {
      if (!filename) {
        throw createServiceError(400, 'Missing filename or newTitle');
      }

      const sanitizedTitle = sanitizePublishText(newTitle, {
        collapseWhitespace: true,
        maxLength: MAX_SHORT_TEXT_LENGTH,
      });

      const source = path.join(galleryDir, filename);
      if (!fs.existsSync(source)) {
        throw createServiceError(404, 'File not found');
      }

      const ext = (path.extname(filename) || '.jpg').replace(/^\./, '') || 'jpg';
      const targetName = sanitizeFilename(sanitizedTitle, ext);
      const target = path.join(galleryDir, targetName);

      try {
        fs.renameSync(source, target);
        return { ok: true, filename: targetName, url: `/generated/${targetName}` };
      } catch (error) {
        log.error(logEmoji.error, '[publish] rename failed', error);
        throw createServiceError(500, 'Rename failed', error.message);
      }
    },
  };
}

module.exports = {
  createPublishService,
};
