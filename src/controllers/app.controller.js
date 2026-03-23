function createAppController(deps) {
  const { publicDir, path } = deps;

  return {
    fallbackToIndex: (_req, res) => {
      res.sendFile(path.join(publicDir, 'index.html'));
    },
  };
}

module.exports = {
  createAppController,
};
