function createGenerationController(deps) {
  const { generationService } = deps;

  return {
    generateModel: async (req, res) => {
      try {
        const result = await generationService.generateModel(req.body?.input || req.body || {}, req.body || {});
        return res.status(200).json(result);
      } catch (error) {
        return res.status(error.status || 500).json({
          error: error.message || 'Replicate request failed',
          details: error.details || error.message,
        });
      }
    },

    generate: async (req, res) => {
      try {
        const result = await generationService.generate(req.body?.input || req.body || {}, req.body || {});
        if (result?.type === 'text') {
          return res.status(result.status || 200).send(result.body);
        }
        return res.status(result?.status || 200).json(result?.body ?? result);
      } catch (error) {
        if (error.code === 'MODEL_BUSY') {
          return res.status(error.status || 503).json({
            error: error.message,
            code: error.code,
          });
        }

        if (error.message === 'Upstream model error') {
          return res.status(error.status || 500).json({
            error: 'Upstream model error',
            status: error.status,
            details: error.details,
          });
        }

        return res.status(error.status || 500).json({
          error: error.message || 'Proxy request failed',
          details: error.details || error.message,
        });
      }
    },

  };
}

module.exports = {
  createGenerationController,
};
