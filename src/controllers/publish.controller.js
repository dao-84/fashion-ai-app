function createPublishController(deps) {
  const { publishService } = deps;

  return {
    describe: async (req, res) => {
      try {
        const { filename, guideline, tone } = req.body || {};
        const result = await publishService.describe(filename, guideline, tone);
        return res.status(200).json(result);
      } catch (error) {
        return res.status(error.status || 500).json({
          error: error.message || 'Describe failed',
          details: error.details || error.message,
        });
      }
    },

    rename: async (req, res) => {
      try {
        const { filename, newTitle } = req.body || {};
        const result = await publishService.rename(filename, newTitle);
        return res.status(200).json(result);
      } catch (error) {
        return res.status(error.status || 500).json({
          error: error.message || 'Rename failed',
          details: error.details || error.message,
        });
      }
    },
  };
}

module.exports = {
  createPublishController,
};
