function createGalleryController(deps) {
  const { galleryService } = deps;

  return {
    list: (_req, res) => {
      try {
        const result = galleryService.list();
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
        const result = await galleryService.remove(req.params.name);
        return res.status(200).json(result);
      } catch (error) {
        return res.status(error.status || 500).json({
          error: error.message || 'Delete failed',
          details: error.details || error.message,
        });
      }
    },
  };
}

module.exports = {
  createGalleryController,
};
