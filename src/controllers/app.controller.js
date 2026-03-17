function createAppController(deps) {
  const { appService, publicDir, path } = deps;

  return {
    prepareOpenAI: async (req, res) => {
      try {
        const result = await appService.prepareOpenAI(req.body || {});
        return res.status(200).json(result);
      } catch (error) {
        return res.status(error.status || 500).json({
          error: error.message || 'OpenAI request failed',
          details: error.details || error.message,
        });
      }
    },

    fallbackToIndex: (_req, res) => {
      res.sendFile(path.join(publicDir, 'index.html'));
    },
  };
}

module.exports = {
  createAppController,
};
