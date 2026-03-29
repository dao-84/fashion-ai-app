function createBillingController({ billingService, env }) {
  const frontendUrl = (process.env.FRONTEND_URL || env?.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

  return {
    checkout: async (req, res) => {
      try {
        const userId = req.auth?.user?.id;
        const userEmail = req.auth?.user?.email;
        const { priceKey } = req.body || {};

        if (!priceKey) return res.status(400).json({ error: 'Piano non specificato' });

        const VALID_PRICE_KEYS = [
          'starter_monthly', 'starter_annual',
          'pro_monthly', 'pro_annual',
          'enterprise_monthly', 'enterprise_annual',
          'credits_10', 'credits_50', 'credits_100',
        ];
        if (!VALID_PRICE_KEYS.includes(priceKey)) {
          return res.status(400).json({ error: 'Piano non valido' });
        }

        const result = await billingService.createCheckoutSession({
          userId,
          userEmail,
          priceKey,
          successUrl: `${frontendUrl}/pricing.html?payment=success`,
          cancelUrl:  `${frontendUrl}/pricing.html?payment=cancelled`,
        });

        return res.status(200).json(result);
      } catch (error) {
        return res.status(error.status || 500).json({ error: error.message || 'Checkout fallito' });
      }
    },

    portal: async (req, res) => {
      try {
        const userId = req.auth?.user?.id;
        const result = await billingService.createPortalSession({
          userId,
          returnUrl: `${frontendUrl}/profile.html`,
        });
        return res.status(200).json(result);
      } catch (error) {
        return res.status(error.status || 500).json({ error: error.message || 'Portal non disponibile' });
      }
    },

    webhook: async (req, res) => {
      try {
        const signature = req.headers['stripe-signature'];
        if (!signature) return res.status(400).json({ error: 'Signature mancante' });
        const result = await billingService.handleWebhook({ rawBody: req.body, signature });
        return res.status(200).json(result);
      } catch (error) {
        return res.status(error.status || 500).json({ error: error.message });
      }
    },
  };
}

module.exports = { createBillingController };
