function createGeminiIntegration(deps) {
  const { fetch, GOOGLE_API_KEY, GEMINI_IMAGE_MODEL } = deps;

  return {
    isConfigured() {
      return !!GOOGLE_API_KEY;
    },

    async generateImage({ prompt, width, height }) {
      if (!GOOGLE_API_KEY) {
        throw new Error('GOOGLE_API_KEY mancante');
      }

      const body = {
        model: GEMINI_IMAGE_MODEL,
        prompt: { text: prompt },
        imageFormat: 'jpeg',
        numberOfImages: 1,
        width,
        height,
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateImages?key=${GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini error ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      return json.candidates?.[0]?.image?.base64 ?? json.data?.[0]?.image?.base64 ?? '';
    },
  };
}

module.exports = {
  createGeminiIntegration,
};
