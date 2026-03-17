const { createAppController } = require('../controllers/app.controller');
const { createGenerationController } = require('../controllers/generation.controller');
const { createGalleryController } = require('../controllers/gallery.controller');
const { createPublishController } = require('../controllers/publish.controller');
const { createAppService } = require('../services/app.service');
const { createGenerationService } = require('../services/generation.service');
const { createGalleryService } = require('../services/gallery.service');
const { createPublishService } = require('../services/publish.service');

function registerMainRoutes(app, deps) {
  const appService = createAppService(deps);
  const generationService = createGenerationService(deps);
  const galleryService = createGalleryService(deps);
  const publishService = createPublishService(deps);

  const appController = createAppController({
    appService,
    publicDir: deps.publicDir,
    path: deps.path,
  });
  const generationController = createGenerationController({ generationService });
  const galleryController = createGalleryController({ galleryService });
  const publishController = createPublishController({ publishService });

  app.post('/api/openai/prepare', appController.prepareOpenAI);

  app.post('/api/publish/describe', publishController.describe);
  app.post('/api/publish/rename', publishController.rename);

  app.post('/api/generate-model', generationController.generateModel);
  app.post('/api/generate', generationController.generate);
  app.post('/api/upscale', generationController.upscale);
  app.post('/api/refine', generationController.refine);

  app.get('/api/gallery', galleryController.list);
  app.delete('/api/gallery/:name', galleryController.remove);

  app.get('*', appController.fallbackToIndex);
}

module.exports = {
  registerMainRoutes,
};
