function createTrackController(deps) {
  const { trackService } = deps;

  return {
    event: (req, res) => {
      try {
        const result = trackService.track(req.body || {});
        return res.status(200).json(result);
      } catch (error) {
        return res.status(error.status || 500).json({
          ok: false,
          error: error.message || 'Track event failed',
          details: error.details || error.message,
        });
      }
    },
  };
}

module.exports = {
  createTrackController,
};
