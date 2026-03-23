const path = require('path');
const express = require('express');
const {
  PUBLIC_HTML_ROUTES,
  PUBLIC_FILE_ROUTES,
  PUBLIC_DIR_ROUTES,
} = require('../config/public-manifest');

function registerPublicStatic(app, deps) {
  const { rootDir, galleryDir } = deps;

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

  app.use('/generated', express.static(galleryDir));
}

module.exports = {
  registerPublicStatic,
};
