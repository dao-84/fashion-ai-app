function createServiceError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  if (details !== undefined) error.details = details;
  return error;
}

const r2 = require('../integrations/storage/r2.integration');

function createGalleryService(deps) {
  const { galleryDir, fs, path, log, logEmoji, getPool, creditService } = deps;

  return {
    async list({ userId } = {}) {
      if (getPool && userId) {
        try {
          const pool = getPool();
          const result = await pool.query(
            'SELECT id, asset_url, asset_url_clean, watermark_removed, autocopy_result, autocopy_style, autocopy_language, created_at FROM generations WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
          );
          const images = result.rows.map((row) => {
            const url = row.watermark_removed && row.asset_url_clean ? row.asset_url_clean : row.asset_url;
            const name = url.split('/').pop();
            return {
              id: row.id,
              name,
              url,
              hasClean: !!row.asset_url_clean,
              watermarkRemoved: row.watermark_removed,
              hasAutocopy: !!row.autocopy_result,
              autocopyResult: row.autocopy_result || null,
              autocopyStyle: row.autocopy_style || null,
              autocopyLanguage: row.autocopy_language || null,
              mtime: new Date(row.created_at).getTime(),
            };
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

    async remove(identifier, { userId } = {}) {
      if (!identifier) {
        throw createServiceError(400, 'Missing identifier');
      }

      const deleteFiles = async (urlA, urlB) => {
        for (const rawUrl of [urlA, urlB]) {
          if (!rawUrl) continue;
          const fname = rawUrl.split('/').pop();
          if (!fname) continue;
          const target = path.join(galleryDir, fname);
          if (target.startsWith(galleryDir) && fs.existsSync(target)) {
            try { fs.unlinkSync(target); } catch (_) {}
          }
          if (r2.isConfigured()) {
            try { await r2.remove(fname); } catch (r2Err) {
              log.warn(logEmoji.warn, `[gallery] eliminazione R2 fallita: ${r2Err.message}`);
            }
          }
        }
      };

      if (getPool && userId) {
        try {
          const pool = getPool();
          // Cerca per ID (percorso principale quando il frontend manda file.id)
          const sel = await pool.query(
            'SELECT asset_url, asset_url_clean FROM generations WHERE id = $1 AND user_id = $2',
            [identifier, userId]
          );
          if (sel.rows.length) {
            const row = sel.rows[0];
            await pool.query('DELETE FROM generations WHERE id = $1 AND user_id = $2', [identifier, userId]);
            await deleteFiles(row.asset_url, row.asset_url_clean);
            return { ok: true };
          }
          // Fallback: cerca per nome file in asset_url o asset_url_clean
          const selByName = await pool.query(
            'SELECT id, asset_url, asset_url_clean FROM generations WHERE user_id = $1 AND (asset_url LIKE $2 OR asset_url_clean LIKE $2)',
            [userId, `%${identifier}`]
          );
          if (selByName.rows.length) {
            const row = selByName.rows[0];
            await pool.query('DELETE FROM generations WHERE id = $1 AND user_id = $2', [row.id, userId]);
            await deleteFiles(row.asset_url, row.asset_url_clean);
            return { ok: true };
          }
        } catch (dbError) {
          log.warn(logEmoji.warn, `[gallery] DB delete fallita: ${dbError.message}`);
        }
      }

      // Fallback filesystem-only (DB non disponibile)
      const target = path.join(galleryDir, identifier);
      if (!target.startsWith(galleryDir)) {
        throw createServiceError(400, 'Invalid path');
      }
      try {
        if (fs.existsSync(target)) {
          fs.unlinkSync(target);
        }
        if (r2.isConfigured()) {
          try {
            await r2.remove(identifier);
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

    async removeWatermark({ generationId, userId }) {
      if (!getPool || !creditService) throw createServiceError(500, 'Servizio non disponibile');
      if (!generationId || !userId) throw createServiceError(400, 'Parametri mancanti');

      const pool = getPool();

      const result = await pool.query(
        'SELECT asset_url_clean, watermark_removed FROM generations WHERE id = $1 AND user_id = $2',
        [generationId, userId]
      );
      if (!result.rows.length) throw createServiceError(404, 'Immagine non trovata');

      const row = result.rows[0];
      if (row.watermark_removed) return { cleanUrl: row.asset_url_clean };
      if (!row.asset_url_clean) throw createServiceError(400, 'Versione pulita non disponibile per questa immagine');

      await creditService.consumeCredits({
        userId,
        amount: 0.5,
        description: 'Rimozione watermark',
      });

      await pool.query(
        'UPDATE generations SET watermark_removed = TRUE WHERE id = $1',
        [generationId]
      );

      return { cleanUrl: row.asset_url_clean };
    },

    async saveAutocopy({ generationId, userId, result, style, language }) {
      if (!getPool) throw createServiceError(500, 'Servizio non disponibile');
      if (!generationId || !userId) throw createServiceError(400, 'Parametri mancanti');

      const pool = getPool();

      // Verifica che la generazione appartenga all'utente
      const check = await pool.query(
        'SELECT id FROM generations WHERE id = $1 AND user_id = $2',
        [generationId, userId]
      );
      if (!check.rows.length) throw createServiceError(404, 'Immagine non trovata');

      await pool.query(
        'UPDATE generations SET autocopy_result = $1, autocopy_style = $2, autocopy_language = $3 WHERE id = $4',
        [JSON.stringify(result), style, language, generationId]
      );

      return { ok: true };
    },
  };
}

module.exports = {
  createGalleryService,
};
