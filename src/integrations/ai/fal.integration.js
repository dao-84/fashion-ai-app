const FAL_MODEL_ID = 'fal-ai/nano-banana-2/edit';

function createFalIntegration(deps) {
  const { FAL_KEY } = deps;

  let fal = null;
  if (FAL_KEY) {
    try {
      const falClient = require('@fal-ai/client');
      fal = falClient.fal ?? falClient;
      fal.config({ credentials: FAL_KEY });
    } catch (_err) {
      fal = null;
    }
  }

  return {
    isConfigured() {
      return !!fal && !!FAL_KEY;
    },

    async runModel(_modelId, input) {
      if (!fal) {
        throw new Error('FAL.AI non configurato: aggiungi FAL_KEY in .env');
      }

      const falInput = { ...input };
      if (falInput.image_input !== undefined) {
        falInput.image_urls = falInput.image_input;
        delete falInput.image_input;
      }
      if (falInput.output_format === 'jpg') {
        falInput.output_format = 'jpeg';
      }

      const result = await fal.subscribe(FAL_MODEL_ID, { input: falInput });

      // FAL.AI restituisce { images: [{ url, content_type }] }
      // Normalizziamo in array di URL, stesso formato di Replicate
      const images = result?.images ?? result?.data?.images ?? [];
      if (images.length > 0) {
        return images.map((img) => img.url ?? img);
      }

      // Fallback: se arriva già un array di URL
      if (Array.isArray(result)) return result;

      throw new Error('FAL.AI: nessuna immagine ricevuta nella risposta');
    },
  };
}

module.exports = {
  createFalIntegration,
};
