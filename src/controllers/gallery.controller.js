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
