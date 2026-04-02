const { createAppController } = require('../controllers/app.controller');
const { createGenerationController } = require('../controllers/generation.controller');
const { createGalleryController } = require('../controllers/gallery.controller');
const { createPublishController } = require('../controllers/publish.controller');
const { createTrackController } = require('../controllers/track.controller');
const { createWaitlistController } = require('../controllers/waitlist.controller');
const { createBillingController } = require('../controllers/billing.controller');
const { createAppService } = require('../services/app.service');
const { createGenerationService } = require('../services/generation.service');
const { createGalleryService } = require('../services/gallery.service');
const { createPublishService } = require('../services/publish.service');
const { createTrackService } = require('../services/track.service');
const { createCreditService } = require('../services/credit.service');
const { createBillingService } = require('../services/billing.service');
const { requireAuth } = require('../middleware/auth.middleware');

function registerMainRoutes(app, deps) {
  const appService = createAppService(deps);
  const creditService = createCreditService({ getPool: deps.getPool });
  const generationService = createGenerationService({ ...deps, falIntegration: deps.falIntegration, googleIntegration: deps.googleIntegration, creditService });
  const galleryService = createGalleryService({ ...deps, creditService });
  const publishService = createPublishService(deps);
  const trackService = createTrackService(deps);
  const billingService = createBillingService({ getPool: deps.getPool, log: deps.log, logEmoji: deps.logEmoji, creditService });

  const appController = createAppController({
    appService,
    publicDir: deps.publicDir,
    path: deps.path,
  });
  const generationController = createGenerationController({ generationService });
  const galleryController = createGalleryController({ galleryService });
  const publishController = createPublishController({ publishService, creditService });
  const trackController = createTrackController({ trackService });
  const waitlistController = createWaitlistController();
  const billingController = createBillingController({ billingService, env: deps.env });

  // Stripe webhook — raw body gestito in app.js prima di express.json()
  app.post('/api/billing/webhook', billingController.webhook);

  app.post('/api/billing/checkout', requireAuth, billingController.checkout);
  app.post('/api/billing/portal', requireAuth, billingController.portal);

  app.get('/api/credits/transactions', requireAuth, async (req, res) => {
    try {
      const transactions = await creditService.getTransactionHistory({ userId: req.auth.user.id, limit: 10 });
      res.json({ transactions });
    } catch (err) {
      res.status(500).json({ error: 'Errore nel caricamento delle transazioni' });
    }
  });

  app.post('/api/waitlist', waitlistController.submit);
  app.post('/api/openai/prepare', requireAuth, appController.prepareOpenAI);
  app.post('/api/track-event', trackController.event);

  app.post('/api/publish/describe', requireAuth, publishController.describe);
  app.post('/api/publish/rename', requireAuth, publishController.rename);

  app.post('/api/generate-model', requireAuth, generationController.generateModel);
  app.post('/api/generate', requireAuth, generationController.generate);
  app.get('/api/job-status/:jobId', requireAuth, generationController.getJobStatus);

  // Proxy download immagini (aggira CORS di R2)
  app.get('/api/download', requireAuth, async (req, res) => {
    const url = req.query.url;
    if (!url || (!url.startsWith('https://') && !url.startsWith('http://'))) {
      return res.status(400).json({ error: 'URL non valido' });
    }
    const r2PublicUrl = (deps.env?.R2_PUBLIC_URL || '').replace(/\/$/, '');
    if (!r2PublicUrl || !url.startsWith(r2PublicUrl)) {
      return res.status(403).json({ error: 'URL non autorizzato' });
    }
    try {
      const response = await deps.fetch(url);
      if (!response.ok) return res.status(502).json({ error: 'Download fallito' });
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const filename = url.split('/').pop().split('?')[0] || 'immagine.jpg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
    } catch (err) {
      res.status(500).json({ error: 'Errore download' });
    }
  });

  app.get('/api/gallery', galleryController.list);
  app.delete('/api/gallery/:name', requireAuth, galleryController.remove);
  app.post('/api/gallery/:id/remove-watermark', requireAuth, galleryController.removeWatermark);
  app.post('/api/gallery/:id/autocopy', requireAuth, galleryController.saveAutocopy);

  app.get('*', appController.fallbackToIndex);
}

module.exports = {
  registerMainRoutes,
};
