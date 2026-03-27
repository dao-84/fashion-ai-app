function createServiceError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  if (details !== undefined) error.details = details;
  return error;
}

const r2 = require('../integrations/storage/r2.integration');

function createGalleryService(deps) {
  const { galleryDir, fs, path, log, logEmoji } = deps;

  return {
    list() {
      try {
        const entries = fs.readdirSync(galleryDir, { withFileTypes: true });
        const images = entries
          .filter((e) => e.isFile())
          .filter((e) => /\.(png|jpg|jpeg|webp)$/i.test(e.name))
          .map((e) => {
            const full = path.join(galleryDir, e.name);
            const stat = fs.statSync(full);
            return {
              name: e.name,
              url: `/generated/${e.name}`,
              mtime: stat.mtimeMs,
            };
          })
          .sort((a, b) => b.mtime - a.mtime);
        return { files: images };
      } catch (error) {
        log.error(logEmoji.error, '[gallery] listing failed', error);
        throw createServiceError(500, 'Gallery listing failed', error.message);
      }
    },

    async remove(filename) {
      if (!filename) {
        throw createServiceError(400, 'Missing filename');
      }

      const target = path.join(galleryDir, filename);
      if (!target.startsWith(galleryDir)) {
        throw createServiceError(400, 'Invalid path');
      }

      try {
        if (fs.existsSync(target)) {
          fs.unlinkSync(target);
        }

        if (r2.isConfigured()) {
          try {
            await r2.remove(filename);
          } catch (r2Error) {
            log.warn(logEmoji.warn, `[gallery] eliminazione R2 fallita: ${r2Error.message}`);
          }
        }

        return { ok: true };
      } catch (error) {
        if (error.status) throw error;
        log.error(logEmoji.error, '[gallery] delete failed', error);
        throw createServiceError(500, 'Delete failed', error.message);
      }
    },
  };
}

module.exports = {
  createGalleryService,
};
