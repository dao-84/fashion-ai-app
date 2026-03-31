const { saveOutputItem, normalizeImageInput } = require('../utils/imageHelpers');
const { hasBannedKeyword, mentionsMinor } = require('../utils/promptGuards');
const { cleanTextInput } = require('../utils/stringHelpers');
const { retryAsync } = require('../utils/asyncRetry');
const r2 = require('../integrations/storage/r2.integration');

// Cache in memoria per i job FAL.AI asincroni
const jobCache = new Map();

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
    falIntegration,
    googleIntegration,
    proxyIntegration,
    log,
    logEmoji,
    REPLICATE_MODEL_VERSION,
    fetch,
    galleryDir,
    publicDir,
    fs,
    path,
    DEFAULT_MODEL_BASE_PROMPT,
    creditService,
    features,
    getPool,
  } = deps;

  // Converte immagini base64 in URL R2 pubblici (richiesto da FAL.AI)
  async function uploadImagesToR2(images, log, logEmoji) {
    return Promise.all(
      images.map(async (uri, idx) => {
        if (!uri.startsWith('data:image/')) return uri; // già un URL pubblico
        const match = uri.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) return uri;
        const mimeType = match[1];
        const ext = mimeType.split('/')[1] || 'jpg';
        const fileName = `input-${Date.now()}-${idx}.${ext}`;
        const buffer = Buffer.from(match[2], 'base64');
        const publicUrl = await r2.upload(buffer, fileName, mimeType);
        log.info(logEmoji.save, `[generate] immagine input caricata su R2: ${publicUrl}`);
        return publicUrl;
      })
    );
  }

  async function collectSavedOutputs(output, plan) {
    const saved = [];
    const items = Array.isArray(output) ? output : [output];
    for (let i = 0; i < items.length; i++) {
      const result = await saveOutputItem(items[i], i, { fetch, fs, path, galleryDir, log, logEmoji, plan });
      if (!result) continue;
      // result può essere { url, cleanUrl } oppure una stringa (fallback)
      if (typeof result === 'string') {
        saved.push({ url: result, cleanUrl: null });
      } else {
        saved.push(result);
      }
    }
    return saved;
  }

  return {
    async generateModel(input = {}, _rawBody = {}, auth = {}) {
      if (!replicateIntegration.isConfigured()) {
        throw createServiceError(400, 'Replicate non configurato.');
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

      // Controllo crediti per generazione modella (costo fisso 1 credito)
      if (features?.enableCredits && auth?.isAuthenticated && creditService) {
        const userId = auth.user.id;
        const userPlan = auth.user.plan || 'free';
        const planRules = creditService.getPlanRules({ plan: userPlan });

        if (!planRules.customModel) {
          throw createServiceError(403, 'La generazione della modella personalizzata non è disponibile nel tuo piano. Passa al piano Pro per sbloccarla.');
        }

        const creditCost = planRules.creditCost['1K'] || 1;
        await creditService.consumeCredits({
          userId,
          amount: creditCost,
          description: 'Generazione modella',
        });
        log.info(logEmoji.generate, `[generate-model] crediti scalati: ${creditCost} (utente ${userId}, piano ${userPlan})`);
      }

      const inputPayload = {
        prompt: cleanedPrompt,
        aspect_ratio: input.aspect_ratio || '4:3',
        output_format: input.output_format || 'jpg',
        image_input: [],
      };

      try {
        log.info(logEmoji.generate, `[generate-model] prompt: ${cleanedPrompt}`);
        log.info(logEmoji.generate, `[generate-model] richiesta a Replicate avviata`);
        const output = await replicateIntegration.runModel(REPLICATE_MODEL_VERSION, inputPayload);
        const userPlanForSave = auth?.user?.plan || 'free';
        const saved = await collectSavedOutputs(output, userPlanForSave);
        log.info(logEmoji.generate, `[generate-model] completata. File salvati: ${saved.length}`);

        if (getPool && auth?.isAuthenticated) {
          try {
            const pool = getPool();
            for (const item of saved) {
              if (item?.url) {
                await pool.query(
                  'INSERT INTO generations (user_id, asset_url, asset_url_clean, provider, resolution, style, credits_used, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                  [auth.user.id, item.url, item.cleanUrl || null, 'Replicate', '1K', 'model', 1, 'completed']
                );
              }
            }
          } catch (dbError) {
            log.warn(logEmoji.warn, `[generate-model] DB insert generazione fallita: ${dbError.message}`);
          }
        }

        return { output, saved: saved.map(s => s?.url || s) };
      } catch (error) {
        log.error(logEmoji.error, `Replicate generate-model failed`, error);
        throw createServiceError(500, `Replicate request failed`, error.message);
      }
    },

    async generate(input = {}, rawBody = {}, auth = {}) {
      const requestedProvider = (rawBody.provider || input.provider || 'replicate').toLowerCase();
      const useFal = requestedProvider === 'fal' && falIntegration && falIntegration.isConfigured();
      const useGoogle = requestedProvider === 'google' && googleIntegration && googleIntegration.isConfigured();
      const activeIntegration = useGoogle ? googleIntegration : useFal ? falIntegration : replicateIntegration;
      const providerName = useGoogle ? 'Google AI' : useFal ? 'FAL.AI' : 'Replicate';

      if (activeIntegration.isConfigured()) {
        let creditCost = 0;
        try {
          if (!input.prompt) {
            throw createServiceError(400, 'Missing prompt in input');
          }

          log.info(logEmoji.generate, `[generate] richiesta a ${providerName} avviata`);
          log.info(logEmoji.generate, `[generate] prompt: ${input.prompt}`);

          const VALID_RESOLUTIONS = ['1K', '2K', '4K'];
          const resolution = VALID_RESOLUTIONS.includes(input.resolution) ? input.resolution : '1K';

          // Controllo crediti (solo se enableCredits è attivo e l'utente è loggato)
          if (features?.enableCredits && auth?.isAuthenticated && creditService) {
            const userId = auth.user.id;
            const userPlan = auth.user.plan || 'free';
            const planRules = creditService.getPlanRules({ plan: userPlan });

            // Verifica che il piano permetta la risoluzione richiesta
            if (!planRules.resolutions.includes(resolution)) {
              throw createServiceError(403, `La risoluzione ${resolution} non è disponibile nel tuo piano. Aggiorna il piano per sbloccarla.`);
            }

            // Verifica che il piano permetta lo stile selezionato
            const requestedStyle = input.style || rawBody.style;
            if (planRules.styles && requestedStyle && !planRules.styles.includes(requestedStyle)) {
              throw createServiceError(403, `Lo stile selezionato non è disponibile nel tuo piano. Aggiorna il piano per sbloccare tutti gli stili.`);
            }

            creditCost = planRules.creditCost[resolution] || 1;
            await creditService.consumeCredits({
              userId,
              amount: creditCost,
              description: `Generazione ${resolution}`,
            });
            log.info(logEmoji.generate, `[generate] crediti scalati: ${creditCost} (utente ${userId}, piano ${userPlan})`);
          }

          const inputPayload = {
            prompt: input.prompt,
            image_input: Array.isArray(input.image_input) ? [...input.image_input] : [],
            aspect_ratio: input.aspect_ratio || '1:1',
            output_format: input.output_format || 'jpg',
            resolution,
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

          // FAL.AI richiede URL pubblici https:// — converti base64 in R2
          // Google AI accetta base64 direttamente — nessun upload necessario
          if (useFal && r2.isConfigured()) {
            inputPayload.image_input = await uploadImagesToR2(inputPayload.image_input, log, logEmoji);
          }

          log.info(logEmoji.generate, `[generate] aspect_ratio: ${inputPayload.aspect_ratio}`);
          log.info(logEmoji.generate, `[generate] resolution: ${inputPayload.resolution}`);

          // ASYNC PATH: FAL.AI usa la coda — risponde subito con jobId
          if (useFal) {
            const requestId = await falIntegration.submitToQueue(REPLICATE_MODEL_VERSION, inputPayload);
            log.info(logEmoji.generate, `[generate] job FAL.AI in coda: ${requestId}`);
            jobCache.set(requestId, {
              status: 'queued',
              createdAt: Date.now(),
              auth,
              plan: auth?.user?.plan || 'free',
              resolution,
              style: input.style || rawBody.style || null,
              creditCost,
              providerName: 'FAL.AI',
              result: null,
              error: null,
            });
            return { type: 'json', status: 202, body: { jobId: requestId, status: 'queued' } };
          }

          const output = await retryAsync(
            () => activeIntegration.runModel(REPLICATE_MODEL_VERSION, inputPayload),
            {
              maxAttempts: 3,
              delaysMs: [2000, 5000],
              shouldRetry: (error) => isRetryableProviderOverload(error),
              onRetry: async (error, attempt, delayMs) => {
                const reason = error?.message || 'temporary provider overload';
                const retryLog = typeof log.warn === 'function' ? log.warn.bind(log) : log.info.bind(log);
                retryLog(
                  logEmoji.warning || logEmoji.generate || logEmoji.error,
                  `[generate] retry ${attempt + 1}/3 in ${delayMs}ms su ${providerName}. Reason: ${reason}`
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
          const userPlanForSave = auth?.user?.plan || 'free';
          const saved = await collectSavedOutputs(output, userPlanForSave);
          log.info(logEmoji.generate, `[generate] completata. File salvati: ${saved.length}`);

          if (getPool && auth?.isAuthenticated) {
            try {
              const pool = getPool();
              for (const item of saved) {
                if (item?.url) {
                  await pool.query(
                    'INSERT INTO generations (user_id, asset_url, asset_url_clean, provider, resolution, style, credits_used, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [auth.user.id, item.url, item.cleanUrl || null, providerName, resolution, input.style || rawBody.style || null, creditCost || 1, 'completed']
                  );
                }
              }
            } catch (dbError) {
              log.warn(logEmoji.warn, `[generate] DB insert generazione fallita: ${dbError.message}`);
            }
          }

          const savedUrls = saved.map(s => s?.url || s);
          return { type: 'json', status: 200, body: { output, saved: savedUrls } };
        } catch (error) {
          // Errori 4xx (validazione, piano, crediti): non rimborsare — i crediti non erano stati scalati
          if (error.status && error.status < 500) throw error;

          // Errore del provider: rimborsa i crediti se erano stati scalati
          if (creditCost > 0 && features?.enableCredits && auth?.isAuthenticated && creditService) {
            try {
              await creditService.refundCredits({
                userId: auth.user.id,
                amount: creditCost,
                description: `Rimborso automatico — errore provider ${providerName}`,
              });
              log.info(logEmoji.generate, `[generate] crediti rimborsati: ${creditCost} (errore provider)`);
            } catch (refundErr) {
              log.error(logEmoji.error, `[generate] rimborso crediti fallito`, refundErr);
            }
          }

          if (isRetryableProviderOverload(error)) {
            throw createServiceError(
              503,
              'The model is currently busy due to high demand. Please try again in a few seconds.',
              undefined,
              'MODEL_BUSY'
            );
          }
          log.error(logEmoji.error, `${providerName} dice no.`, error);
          throw createServiceError(500, `${providerName} request failed`, error.message);
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

    async getJobStatus(jobId) {
      const cached = jobCache.get(jobId);
      if (!cached) {
        throw createServiceError(404, 'Job non trovato o scaduto.');
      }

      // Risultato già in cache — non rielaborare
      if (cached.status === 'done') {
        return { status: 'done', saved: cached.result.saved, output: cached.result.output };
      }
      if (cached.status === 'error') {
        return { status: 'error', message: cached.error };
      }

      // Chiedi a FAL lo stato attuale
      let falStatus;
      try {
        falStatus = await falIntegration.getQueueStatus(jobId);
      } catch (err) {
        throw createServiceError(500, 'Errore nel controllo stato job FAL.AI', err.message);
      }

      const status = falStatus?.status;

      if (status === 'IN_QUEUE') {
        return { status: 'queued' };
      }
      if (status === 'IN_PROGRESS') {
        cached.status = 'processing';
        return { status: 'processing' };
      }
      if (status === 'FAILED') {
        cached.status = 'error';
        cached.error = 'Generazione fallita su FAL.AI';
        return { status: 'error', message: cached.error };
      }
      if (status === 'COMPLETED') {
        try {
          const output = await falIntegration.getQueueResult(jobId);
          const plan = cached.plan || 'free';
          const saved = await collectSavedOutputs(output, plan);
          const savedUrls = saved.map((s) => s?.url || s);

          // DB insert se utente loggato
          if (getPool && cached.auth?.isAuthenticated) {
            try {
              const pool = getPool();
              for (const item of saved) {
                if (item?.url) {
                  await pool.query(
                    'INSERT INTO generations (user_id, asset_url, asset_url_clean, provider, resolution, style, credits_used, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [cached.auth.user.id, item.url, item.cleanUrl || null, 'FAL.AI', cached.resolution, cached.style, cached.creditCost || 0, 'completed']
                  );
                }
              }
            } catch (dbErr) {
              log.warn(logEmoji.warn, `[job-status] DB insert fallita: ${dbErr.message}`);
            }
          }

          cached.status = 'done';
          cached.result = { saved: savedUrls, output };
          log.info(logEmoji.generate, `[job-status] job ${jobId} completato. File salvati: ${savedUrls.length}`);
          return { status: 'done', saved: savedUrls, output };
        } catch (err) {
          cached.status = 'error';
          cached.error = err.message;
          throw createServiceError(500, 'Errore nel salvataggio immagine', err.message);
        }
      }

      // Status sconosciuto — consideralo in elaborazione
      return { status: 'processing' };
    },

  };
}

module.exports = {
  createGenerationService,
};
