const { app, PORT, log, logEmoji, logProvider } = require('./app');

app.listen(PORT, () => {
  log.info(logEmoji.startup, `Server running on http://localhost:${PORT}`);
  logProvider();
});
