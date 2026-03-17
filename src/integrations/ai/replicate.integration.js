function createReplicateIntegration(deps) {
  const { replicate } = deps;

  return {
    isConfigured() {
      return !!replicate;
    },

    async runModel(version, input) {
      if (!replicate) {
        throw new Error('Replicate non configurato');
      }

      return replicate.run(version, { input });
    },
  };
}

module.exports = {
  createReplicateIntegration,
};
