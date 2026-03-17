function createServiceError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  if (details !== undefined) error.details = details;
  return error;
}

function createAppService(deps) {
  const { openaiIntegration, log, logEmoji } = deps;

  return {
    async prepareOpenAI(messagesPayload = {}) {
      const incomingMessages = messagesPayload?.messages || [];
      const firstUserMsg =
        Array.isArray(incomingMessages) && incomingMessages.find((m) => m?.role === 'user')?.content;
      if (firstUserMsg) {
        log.info(logEmoji.openai, `[openai] prompt ricevuto: ${firstUserMsg}`);
      }

      if (!openaiIntegration.isConfigured()) {
        throw createServiceError(500, 'OpenAI non configurato. Aggiungi OPENAI_API_KEY in .env');
      }

      try {
        const prepared = await openaiIntegration.prepareReplicateInput(messagesPayload || {});
        if (typeof prepared === 'string') {
          log.info(logEmoji.openai, `[openai] prompt generato: ${prepared}`);
        } else {
          log.info(logEmoji.openai, '[openai] input generato per Replicate');
        }
        return { result: prepared };
      } catch (error) {
        log.error(logEmoji.error, '[openai] errore nella preparazione input', error);
        throw createServiceError(500, 'OpenAI request failed', error.message);
      }
    },
  };
}

module.exports = {
  createAppService,
};
