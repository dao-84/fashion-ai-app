function createGalleryController(deps) {
  const { galleryService } = deps;

  return {
    list: async (req, res) => {
      try {
        const userId = req.auth?.user?.id;
        const result = await galleryService.list({ userId });
        return res.status(200).json(result);
      } catch (error) {
        return res.status(error.status || 500).json({
          error: error.message || 'Gallery listing failed',
          details: error.details || error.message,
        });
      }
    },

    remove: async (req, res) => {
      try {
        const userId = req.auth?.user?.id;
        const result = await galleryService.remove(req.params.name, { userId });
        return res.status(200).json(result);
      } catch (error) {
        return res.status(error.status || 500).json({
          error: error.message || 'Delete failed',
          details: error.details || error.message,
        });
      }
    },

    removeWatermark: async (req, res) => {
      try {
        const userId = req.auth?.user?.id;
        const generationId = req.params.id;
        const result = await galleryService.removeWatermark({ generationId, userId });
        return res.status(200).json(result);
      } catch (error) {
        return res.status(error.status || 500).json({
          error: error.message || 'Rimozione watermark fallita',
          details: error.details || error.message,
        });
      }
    },

    saveAutocopy: async (req, res) => {
      try {
        const userId = req.auth?.user?.id;
        const generationId = req.params.id;
        const { result, style, language } = req.body || {};
        if (!result) return res.status(400).json({ error: 'Risultato AutoCopy mancante' });
        const VALID_STYLES = ['ecommerce', 'social', 'editorial', 'marketplace'];
        const VALID_LANGS = ['it', 'en', 'es'];
        if (style && !VALID_STYLES.includes(style)) return res.status(400).json({ error: 'Stile non valido' });
        if (language && !VALID_LANGS.includes(language)) return res.status(400).json({ error: 'Lingua non valida' });
        const saved = await galleryService.saveAutocopy({ generationId, userId, result, style, language });
        return res.status(200).json(saved);
      } catch (error) {
        return res.status(error.status || 500).json({
          error: error.message || 'Salvataggio AutoCopy fallito',
          details: error.details || error.message,
        });
      }
    },
  };
}

module.exports = {
  createGalleryController,
};
