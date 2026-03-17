function createGenerationController(deps) {
  const { generationService } = deps;

  return {
    generateModel: async (req, res) => {
      try {
        const result = await generationService.generateModel(req.body?.input || req.body || {});
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

    upscale: async (req, res) => {
      try {
        const result = await generationService.upscale(req.body?.image || req.body?.input?.image || '');
        return res.status(200).json(result);
      } catch (error) {
        return res.status(error.status || 500).json({
          error: error.message || 'Replicate request failed',
          details: error.details || error.message,
        });
      }
    },

    refine: async (req, res) => {
      try {
        const result = await generationService.refine(
          req.body?.image || req.body?.input?.image || '',
          req.body?.prompt || req.body?.input?.prompt || ''
        );
        return res.status(200).json(result);
      } catch (error) {
        return res.status(error.status || 500).json({
          error: error.message || 'Replicate request failed',
          details: error.details || error.message,
        });
      }
    },
  };
}

module.exports = {
  createGenerationController,
};
