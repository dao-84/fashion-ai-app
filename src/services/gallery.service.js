const { sanitizeFilename, resolveGeneratedFilePath } = require('../utils/security.utils');

function createServiceError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  if (details !== undefined) error.details = details;
  return error;
}

function createGalleryService(deps) {
  const { galleryDir, fs, path, log, logEmoji } = deps;

  return {
    list() {
      try {
        const entries = fs.readdirSync(galleryDir, { withFileTypes: true });
        const images = entries
          .filter((e) => e.isFile())
          .filter((e) => /\.(png|jpg|jpeg|webp)$/i.test(e.name))
          .flatMap((e) => {
            try {
              const safeName = sanitizeFilename(e.name);
              const full = resolveGeneratedFilePath(galleryDir, safeName);
              const stat = fs.statSync(full);
              return [{
                name: safeName,
                url: `/generated/${safeName}`,
                mtime: stat.mtimeMs,
              }];
            } catch (_error) {
              return [];
            }
          })
          .sort((a, b) => b.mtime - a.mtime);
        return { files: images };
      } catch (error) {
        log.error(logEmoji.error, '[gallery] listing failed', error);
        throw createServiceError(500, 'Gallery listing failed', error.message);
      }
    },

    remove(filename) {
      if (!filename) {
        throw createServiceError(400, 'Invalid filename');
      }

      let target;
      try {
        target = resolveGeneratedFilePath(galleryDir, filename);
      } catch (error) {
        const message = error.message === 'Invalid file path' ? 'Invalid file path' : 'Invalid filename';
        throw createServiceError(400, message);
      }

      try {
        if (fs.existsSync(target)) {
          fs.unlinkSync(target);
          return { ok: true };
        }
        throw createServiceError(404, 'File not found');
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
