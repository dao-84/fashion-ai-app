const { PLANS } = require('../config/constants');

function createPublishController(deps) {
  const { publishService, creditService } = deps;

  return {
    describe: async (req, res) => {
      try {
        const { imageUrl, style, language, userText } = req.body || {};
        const userId = req.auth?.user?.id;
        const userPlan = req.auth?.user?.plan || 'free';

        if (!imageUrl || typeof imageUrl !== 'string') {
          return res.status(400).json({ error: 'imageUrl mancante' });
        }
        const r2Base = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
        if (r2Base && !imageUrl.startsWith(r2Base)) {
          return res.status(403).json({ error: 'URL immagine non autorizzato' });
        }
        const safeUserText = typeof userText === 'string' ? userText.slice(0, 500) : '';

        const planConfig = PLANS[userPlan] || PLANS.free;
        const creditCost = planConfig.listingGeneratorCost ?? 0.5;

        // Scala crediti se il piano prevede un costo
        if (creditCost > 0 && userId && creditService) {
          await creditService.consumeCredits({
            userId,
            amount: creditCost,
            description: 'AutoCopy',
          });
        }

        const result = await publishService.describe(imageUrl, style, safeUserText, language);
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
