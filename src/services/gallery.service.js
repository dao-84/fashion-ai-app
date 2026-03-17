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

    remove(filename) {
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
