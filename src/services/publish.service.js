const { sanitizeFilename } = require('../utils/sanitizeFilename');

function createServiceError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  if (details !== undefined) error.details = details;
  return error;
}

function createPublishService(deps) {
  const { openaiIntegration, galleryDir, fs, path, log, logEmoji, fetch } = deps;

  return {
    async describe(imageSource, guideline, userText, language) {
      if (!openaiIntegration.isConfigured()) {
        throw createServiceError(500, 'OpenAI non configurato. Aggiungi OPENAI_API_KEY in .env');
      }
      if (!imageSource) {
        throw createServiceError(400, 'Missing image source');
      }

      try {
        let dataUri;

        if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
          // URL R2: scarica l'immagine e convertila in base64
          const response = await fetch(imageSource);
          if (!response.ok) throw new Error('Download immagine fallito');
          const buffer = Buffer.from(await response.arrayBuffer());
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          dataUri = `data:${contentType};base64,${buffer.toString('base64')}`;
        } else {
          // Fallback: nome file locale
          const filePath = path.join(galleryDir, imageSource);
          if (!fs.existsSync(filePath)) throw createServiceError(404, 'File not found');
          const buffer = fs.readFileSync(filePath);
          const ext = path.extname(filePath).replace('.', '') || 'jpg';
          dataUri = `data:image/${ext};base64,${buffer.toString('base64')}`;
        }

        const content = await openaiIntegration.describeImage({ dataUri, style: guideline, userText, language });
        let parsed = null;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch (_err) {
          parsed = null;
        }

        return { raw: content, result: parsed };
      } catch (error) {
        if (error.status) throw error;
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
