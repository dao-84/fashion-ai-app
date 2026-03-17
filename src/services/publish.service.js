const { sanitizeFilename } = require('../utils/sanitizeFilename');

function createServiceError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  if (details !== undefined) error.details = details;
  return error;
}

function createPublishService(deps) {
  const { openaiIntegration, galleryDir, fs, path, log, logEmoji } = deps;

  return {
    async describe(filename, guideline, tone) {
      if (!openaiIntegration.isConfigured()) {
        throw createServiceError(500, 'OpenAI non configurato. Aggiungi OPENAI_API_KEY in .env');
      }
      if (!filename) {
        throw createServiceError(400, 'Missing filename');
      }

      const filePath = path.join(galleryDir, filename);
      if (!fs.existsSync(filePath)) {
        throw createServiceError(404, 'File not found');
      }

      try {
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).replace('.', '') || 'jpg';
        const dataUri = `data:image/${ext};base64,${buffer.toString('base64')}`;

        const content = await openaiIntegration.describeImage({
          dataUri,
          guideline,
          tone,
        });
        let parsed = null;
        try {
          parsed = JSON.parse(content);
        } catch (_err) {
          parsed = null;
        }

        return { raw: content, result: parsed };
      } catch (error) {
        log.error(logEmoji.error, '[publish] describe failed', error);
        throw createServiceError(500, 'Describe failed', error.message);
      }
    },

    rename(filename, newTitle) {
      if (!filename || !newTitle) {
        throw createServiceError(400, 'Missing filename or newTitle');
      }

      const source = path.join(galleryDir, filename);
      if (!fs.existsSync(source)) {
        throw createServiceError(404, 'File not found');
      }

      const ext = (path.extname(filename) || '.jpg').replace(/^\./, '') || 'jpg';
      const targetName = sanitizeFilename(newTitle, ext);
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
