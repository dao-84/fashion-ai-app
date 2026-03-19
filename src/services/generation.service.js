const { saveOutputItem, normalizeImageInput } = require('../utils/imageHelpers');
const { hasBannedKeyword, mentionsMinor } = require('../utils/promptGuards');
const { cleanTextInput } = require('../utils/stringHelpers');
const { retryAsync } = require('../utils/asyncRetry');

function createServiceError(status, message, details, code) {
  const error = new Error(message);
  error.status = status;
  if (details !== undefined) error.details = details;
  if (code !== undefined) error.code = code;
  return error;
}

const RETRYABLE_PROVIDER_MESSAGES = [
  'too many requests',
  'high demand',
  'service is currently unavailable',
  'temporarily unavailable',
  'please try again later',
  'e003',
];

function getErrorText(error) {
  return [
    error?.message,
    typeof error?.details === 'string' ? error.details : '',
    typeof error?.cause?.message === 'string' ? error.cause.message : '',
  ]
    .filter(Boolean)
    .join(' | ')
    .toLowerCase();
}

function isRetryableProviderOverload(error) {
  if (!error) return false;
  if (Number(error.status) === 429) return true;
  const text = getErrorText(error);
  return RETRYABLE_PROVIDER_MESSAGES.some((message) => text.includes(message));
}

function createGenerationService(deps) {
  const {
    replicateIntegration,
    proxyIntegration,
    log,
    logEmoji,
    REPLICATE_MODEL_VERSION,
    REPLICATE_UPSCALE_MODEL_VERSION,
    REPLICATE_REFINER_MODEL_VERSION,
    fetch,
    galleryDir,
    publicDir,
    fs,
    path,
    DEFAULT_MODEL_BASE_PROMPT,
  } = deps;

  async function collectSavedOutputs(output) {
    const saved = [];
    const items = Array.isArray(output) ? output : [output];
    for (let i = 0; i < items.length; i++) {
      const savedPath = await saveOutputItem(items[i], i, { fetch, fs, path, galleryDir, log, logEmoji });
      if (savedPath) saved.push(savedPath);
    }
    return saved;
  }

  return {
    async generateModel(input = {}) {
      if (!replicateIntegration.isConfigured()) {
        throw createServiceError(400, 'Replicate non configurato: aggiungi REPLICATE_API_TOKEN in .env');
      }

      const rawPrompt = input.prompt || '';
      const cleanedPrompt = cleanTextInput(rawPrompt);

      if (!cleanedPrompt) {
        throw createServiceError(400, 'Prompt mancante o vuoto.');
      }
      if (cleanedPrompt.length > 500) {
        throw createServiceError(400, 'Prompt troppo lungo. Limite massimo 500 caratteri.');
      }
      if (mentionsMinor(cleanedPrompt)) {
        throw createServiceError(400, 'Richiesta non consentita: riferimenti a minori.');
      }
      if (hasBannedKeyword(cleanedPrompt)) {
        throw createServiceError(400, 'Richiesta non consentita: il prompt contiene termini non ammessi.');
      }

      const alreadyHasBase =
        cleanedPrompt.toLowerCase().includes(DEFAULT_MODEL_BASE_PROMPT.toLowerCase());
      const finalPrompt = alreadyHasBase
        ? cleanedPrompt
        : `${DEFAULT_MODEL_BASE_PROMPT} ${cleanedPrompt}`.trim();

      if (finalPrompt.length > 500) {
        throw createServiceError(400, 'Prompt troppo lungo dopo la normalizzazione. Limite massimo 500 caratteri.');
      }

      const inputPayload = {
        prompt: finalPrompt,
        aspect_ratio: '3:4',
        output_format: input.output_format || 'jpg',
      };

      try {
        log.info(logEmoji.generate, `[generate-model] prompt: ${finalPrompt}`);
        log.info(logEmoji.generate, `[generate-model] richiesta a Replicate avviata (${REPLICATE_MODEL_VERSION})`);
        const output = await replicateIntegration.runModel(REPLICATE_MODEL_VERSION, inputPayload);
        const saved = await collectSavedOutputs(output);
        log.info(logEmoji.generate, `[generate-model] completata. File salvati: ${saved.length}`);
        return { output, saved };
      } catch (error) {
        log.error(logEmoji.error, 'Replicate model (persona) failed', error);
        throw createServiceError(500, 'Replicate request failed', error.message);
      }
    },

    async generate(input = {}, rawBody = {}) {
      if (replicateIntegration.isConfigured()) {
        try {
          if (!input.prompt) {
            throw createServiceError(400, 'Missing prompt in input');
          }

          log.info(logEmoji.generate, '[generate] richiesta a Replicate avviata');
          log.info(logEmoji.generate, `[generate] prompt: ${input.prompt}`);

          const inputPayload = {
            prompt: input.prompt,
            image_input: Array.isArray(input.image_input) ? [...input.image_input] : [],
            aspect_ratio: input.aspect_ratio || '1:1',
            output_format: input.output_format || 'jpg',
          };

          if (Array.isArray(inputPayload.image_input)) {
            inputPayload.image_input = inputPayload.image_input
              .map((img) => normalizeImageInput(img, { fs, path, publicDir, galleryDir }))
              .map((normalized) => {
                if (!normalized?.value) {
                  throw createServiceError(
                    400,
                    normalized?.error ||
                      'Invalid image input format. Configure a public asset URL or use a locally resolvable file.'
                  );
                }

                return normalized;
              });

            const summary = inputPayload.image_input.map((normalized, idx) => {
              const uri = normalized.value;
              if (uri.startsWith('data:image/')) return `data-uri-${idx}`;
              return uri;
            });
            log.info(logEmoji.generate, `[generate] immagini normalizzate: ${summary.join(', ')}`);

            inputPayload.image_input = inputPayload.image_input.map((normalized) => normalized.value);
          }

          if (!inputPayload.image_input.length) {
            throw createServiceError(400, 'image_input must include at least one URI (http/https or data URI)');
          }

          log.info(logEmoji.generate, `[generate] aspect_ratio: ${inputPayload.aspect_ratio}`);

          const output = await retryAsync(
            () => replicateIntegration.runModel(REPLICATE_MODEL_VERSION, inputPayload),
            {
              maxAttempts: 3,
              delaysMs: [2000, 5000],
              shouldRetry: (error) => isRetryableProviderOverload(error),
              onRetry: async (error, attempt, delayMs) => {
                const reason = error?.message || 'temporary provider overload';
                const retryLog = typeof log.warn === 'function' ? log.warn.bind(log) : log.info.bind(log);
                retryLog(
                  logEmoji.warning || logEmoji.generate || logEmoji.error,
                  `[generate] retry ${attempt + 1}/3 in ${delayMs}ms. Reason: ${reason}`
                );
              },
              onGiveUp: async (error, attempt) => {
                const classification = isRetryableProviderOverload(error) ? 'retryable' : 'non-retryable';
                log.error(
                  logEmoji.error,
                  `[generate] retries exhausted after ${attempt} attempt(s). Final classification: ${classification}`,
                  error
                );
              },
            }
          );
          const saved = await collectSavedOutputs(output);
          log.info(logEmoji.generate, `[generate] completata. File salvati: ${saved.length}`);
          return { type: 'json', status: 200, body: { output, saved } };
        } catch (error) {
          if (isRetryableProviderOverload(error)) {
            throw createServiceError(
              503,
              'The model is currently busy due to high demand. Please try again in a few seconds.',
              undefined,
              'MODEL_BUSY'
            );
          }
          if (error.status) throw error;
          log.error(logEmoji.error, 'Replicate dice no.', error);
          throw createServiceError(500, 'Replicate request failed', error.message);
        }
      }

      if (!proxyIntegration.isConfigured()) {
        throw createServiceError(500, 'No provider configured. Set REPLICATE_API_TOKEN or API_BASE_URL/API_KEY in .env');
      }

      try {
        const promptText = rawBody?.prompt || rawBody?.input?.prompt;
        if (promptText) {
          log.info(logEmoji.generate, `[proxy] prompt: ${promptText}`);
        }

        const response = await proxyIntegration.generate(rawBody || {});
        const payload = response.body;

        if (!response.ok) {
          throw createServiceError(response.status, 'Upstream model error', payload);
        }

        return { type: response.isJson ? 'json' : 'text', status: 200, body: payload };
      } catch (error) {
        if (error.status) throw error;
        log.error(logEmoji.error, 'Proxy error:', error);
        throw createServiceError(500, 'Proxy request failed', error.message);
      }
    },

    async upscale(rawImage) {
      if (!replicateIntegration.isConfigured()) {
        throw createServiceError(400, 'Replicate non configurato: aggiungi REPLICATE_API_TOKEN in .env');
      }
      if (!rawImage) {
        throw createServiceError(400, 'Missing image input');
      }

      const normalizedImage = normalizeImageInput(rawImage, { fs, path, publicDir, galleryDir });
      if (!normalizedImage?.value) {
        throw createServiceError(400, normalizedImage?.error || 'Invalid image input format');
      }

      try {
        log.info(logEmoji.generate, '[upscale] richiesta a Replicate avviata');
        const output = await replicateIntegration.runModel(REPLICATE_UPSCALE_MODEL_VERSION, {
          image: normalizedImage.value,
        });
        const saved = await collectSavedOutputs(output);
        log.info(logEmoji.generate, `[upscale] completata. File salvati: ${saved.length}`);
        return { output, saved };
      } catch (error) {
        log.error(logEmoji.error, 'Replicate upscale failed', error);
        throw createServiceError(500, 'Replicate request failed', error.message);
      }
    },

    async refine(rawImage, rawPrompt) {
      if (!replicateIntegration.isConfigured()) {
        throw createServiceError(400, 'Replicate non configurato: aggiungi REPLICATE_API_TOKEN in .env');
      }
      if (!rawImage) {
        throw createServiceError(400, 'Missing image input');
      }
      if (!rawPrompt) {
        throw createServiceError(400, 'Missing prompt input');
      }

      const normalizedImage = normalizeImageInput(rawImage, { fs, path, publicDir, galleryDir });
      if (!normalizedImage?.value) {
        throw createServiceError(400, normalizedImage?.error || 'Invalid image input format');
      }

      try {
        log.info(logEmoji.generate, '[refine] richiesta a Replicate avviata');
        log.info(logEmoji.generate, `[refine] prompt: ${rawPrompt}`);
        const output = await replicateIntegration.runModel(REPLICATE_REFINER_MODEL_VERSION, {
          image: normalizedImage.value,
          prompt: rawPrompt,
        });
        const saved = await collectSavedOutputs(output);
        log.info(logEmoji.generate, `[refine] completata. File salvati: ${saved.length}`);
        return { output, saved };
      } catch (error) {
        log.error(logEmoji.error, 'Replicate refine failed', error);
        throw createServiceError(500, 'Replicate request failed', error.message);
      }
    },
  };
}

module.exports = {
  createGenerationService,
};
