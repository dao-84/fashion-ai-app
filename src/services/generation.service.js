const { saveOutputItem, normalizeImageInput } = require('../utils/imageHelpers');
const { hasBannedKeyword, mentionsMinor } = require('../utils/promptGuards');
const { cleanTextInput } = require('../utils/stringHelpers');
const { retryAsync } = require('../utils/asyncRetry');
const { sanitizeTextField } = require('../utils/request-sanitizer');
const { MAX_PROMPT_LENGTH } = require('../config/constants');

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

function sanitizeRequestText(value, options = {}) {
  try {
    return sanitizeTextField(value, options);
  } catch (error) {
    throw createServiceError(400, error.message || 'Invalid request payload');
  }
}

function createGenerationService(deps) {
  const {
    replicateIntegration,
    log,
    logEmoji,
    REPLICATE_MODEL_VERSION,
    fetch,
    galleryDir,
    publicDir,
    fs,
    path,
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

      const rawPrompt = sanitizeRequestText(input.prompt, {
        collapseWhitespace: true,
        maxLength: MAX_PROMPT_LENGTH,
      });
      const cleanedPrompt = cleanTextInput(rawPrompt);

      if (!cleanedPrompt) {
        throw createServiceError(400, 'Invalid request payload');
      }
      if (mentionsMinor(cleanedPrompt)) {
        throw createServiceError(400, 'Richiesta non consentita: riferimenti a minori.');
      }
      if (hasBannedKeyword(cleanedPrompt)) {
        throw createServiceError(400, 'Richiesta non consentita: il prompt contiene termini non ammessi.');
      }

      const inputPayload = {
        prompt: cleanedPrompt,
        aspect_ratio: input.aspect_ratio || '4:3',
        output_format: input.output_format || 'jpg',
      };

      try {
        log.info(logEmoji.generate, `[generate-model] prompt: ${cleanedPrompt}`);
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

    async generate(input = {}) {
      if (!replicateIntegration.isConfigured()) {
        throw createServiceError(500, 'Replicate non configurato: aggiungi REPLICATE_API_TOKEN in .env');
      }

      try {
        const prompt = sanitizeRequestText(input.prompt, {
          collapseWhitespace: true,
          maxLength: MAX_PROMPT_LENGTH,
        });

        log.info(logEmoji.generate, '[generate] richiesta a Replicate avviata');
        log.info(logEmoji.generate, `[generate] prompt: ${prompt}`);

        const inputPayload = {
          prompt,
          image_input: Array.isArray(input.image_input) ? [...input.image_input] : [],
          aspect_ratio: input.aspect_ratio || '1:1',
          output_format: input.output_format || 'jpg',
        };

        if (!Array.isArray(input.image_input)) {
          throw createServiceError(400, 'Invalid request payload');
        }

        if (Array.isArray(inputPayload.image_input)) {
          inputPayload.image_input = inputPayload.image_input
            .map((img) => normalizeImageInput(img, { fs, path, publicDir, galleryDir }))
            .map((normalized) => {
              if (!normalized?.value) {
                log.warn(logEmoji.warn, '[validation] invalid image input on /api/generate');
                throw createServiceError(
                  400,
                  normalized?.error || 'Invalid image input'
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
          throw createServiceError(400, 'Invalid image input');
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
    },
  };
}

module.exports = {
  createGenerationService,
};
