const path = require('path');
const express = require('express');
const { sanitizeFilename, resolveGeneratedFilePath } = require('../utils/security.utils');
const {
  PUBLIC_HTML_ROUTES,
  PUBLIC_FILE_ROUTES,
  PUBLIC_DIR_ROUTES,
} = require('../config/public-manifest');

function registerPublicStatic(app, deps) {
  const { rootDir, galleryDir, fs } = deps;

  app.use('/storage', (_req, res) => {
    res.status(404).end();
  });

  PUBLIC_DIR_ROUTES.forEach((dirName) => {
    app.use(`/${dirName}`, express.static(path.join(rootDir, dirName)));
  });

  PUBLIC_FILE_ROUTES.forEach(([routePath, fileName]) => {
    app.get(routePath, (_req, res) => {
      res.sendFile(path.join(rootDir, fileName));
    });
  });

  PUBLIC_HTML_ROUTES.forEach(([routePath, fileName]) => {
    app.get(routePath, (_req, res) => {
      res.sendFile(path.join(rootDir, fileName));
    });
  });

  app.get('/generated/:name', (req, res) => {
    try {
      const safeName = sanitizeFilename(req.params.name);
      const fullPath = resolveGeneratedFilePath(galleryDir, safeName);
      if (!fs.existsSync(fullPath)) {
        return res.status(404).end();
      }
      return res.sendFile(fullPath);
    } catch (_error) {
      return res.status(404).end();
    }
  });
}

module.exports = {
  registerPublicStatic,
};
