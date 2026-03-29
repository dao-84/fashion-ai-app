function createServiceError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  if (details !== undefined) error.details = details;
  return error;
}

const r2 = require('../integrations/storage/r2.integration');

function createGalleryService(deps) {
  const { galleryDir, fs, path, log, logEmoji, getPool } = deps;

  return {
    async list({ userId } = {}) {
      if (getPool && userId) {
        try {
          const pool = getPool();
          const result = await pool.query(
            'SELECT asset_url, created_at FROM generations WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
          );
          const images = result.rows.map((row) => {
            const url = row.asset_url;
            const name = url.split('/').pop();
            return { name, url, mtime: new Date(row.created_at).getTime() };
          });
          return { files: images };
        } catch (error) {
          log.error(logEmoji.error, '[gallery] DB listing failed', error);
          throw createServiceError(500, 'Gallery listing failed', error.message);
        }
      }

      // Fallback filesystem (utente non autenticato o DB non disponibile)
      try {
        const entries = fs.readdirSync(galleryDir, { withFileTypes: true });
        const images = entries
          .filter((e) => e.isFile())
          .filter((e) => /\.(png|jpg|jpeg|webp)$/i.test(e.name))
          .map((e) => {
            const full = path.join(galleryDir, e.name);
            const stat = fs.statSync(full);
            return { name: e.name, url: `/generated/${e.name}`, mtime: stat.mtimeMs };
          })
          .sort((a, b) => b.mtime - a.mtime);
        return { files: images };
      } catch (error) {
        log.error(logEmoji.error, '[gallery] listing failed', error);
        throw createServiceError(500, 'Gallery listing failed', error.message);
      }
    },

    async remove(filename, { userId } = {}) {
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

        if (getPool && userId) {
          try {
            const pool = getPool();
            await pool.query(
              'DELETE FROM generations WHERE user_id = $1 AND asset_url LIKE $2',
              [userId, `%${filename}`]
            );
          } catch (dbError) {
            log.warn(logEmoji.warn, `[gallery] DB delete fallita: ${dbError.message}`);
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
