const { createAppController } = require('../controllers/app.controller');
const { createGenerationController } = require('../controllers/generation.controller');
const { createGalleryController } = require('../controllers/gallery.controller');
const { createPublishController } = require('../controllers/publish.controller');
const { createTrackController } = require('../controllers/track.controller');
const { createWaitlistController } = require('../controllers/waitlist.controller');
const { createAppService } = require('../services/app.service');
const { createGenerationService } = require('../services/generation.service');
const { createGalleryService } = require('../services/gallery.service');
const { createPublishService } = require('../services/publish.service');
const { createTrackService } = require('../services/track.service');

function registerMainRoutes(app, deps) {
  const appService = createAppService(deps);
  const generationService = createGenerationService({ ...deps, falIntegration: deps.falIntegration, googleIntegration: deps.googleIntegration });
  const galleryService = createGalleryService(deps);
  const publishService = createPublishService(deps);
  const trackService = createTrackService(deps);

  const appController = createAppController({
    appService,
    publicDir: deps.publicDir,
    path: deps.path,
  });
  const generationController = createGenerationController({ generationService });
  const galleryController = createGalleryController({ galleryService });
  const publishController = createPublishController({ publishService });
  const trackController = createTrackController({ trackService });
  const waitlistController = createWaitlistController();

  app.post('/api/waitlist', waitlistController.submit);
  app.post('/api/openai/prepare', appController.prepareOpenAI);
  app.post('/api/track-event', trackController.event);

  app.post('/api/publish/describe', publishController.describe);
  app.post('/api/publish/rename', publishController.rename);

  app.post('/api/generate-model', generationController.generateModel);
  app.post('/api/generate', generationController.generate);

  app.get('/api/gallery', galleryController.list);
  app.delete('/api/gallery/:name', galleryController.remove);

  app.get('*', appController.fallbackToIndex);
}

module.exports = {
  registerMainRoutes,
};
