const PUBLIC_HTML_ROUTES = [
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/gallery.html', 'gallery.html'],
  ['/studio.html', 'studio.html'],
  ['/privacy.html', 'privacy.html'],
  ['/terms.html', 'terms.html'],
  ['/cookies.html', 'cookies.html'],
];

const PUBLIC_FILE_ROUTES = [
  ['/templatemo-prism-flux.css', 'templatemo-prism-flux.css'],
  ['/templatemo-prism-scripts.js', 'templatemo-prism-scripts.js'],
];

const PUBLIC_DIR_ROUTES = ['images', 'fonts', 'animations'];

module.exports = {
  PUBLIC_HTML_ROUTES,
  PUBLIC_FILE_ROUTES,
  PUBLIC_DIR_ROUTES,
};
