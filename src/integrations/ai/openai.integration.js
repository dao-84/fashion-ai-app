function createOpenAIIntegration(deps) {
  const { openai, OPENAI_MODEL, OPENAI_IMAGE_MODEL } = deps;

  return {
    isConfigured() {
      return !!openai;
    },

    async prepareReplicateInput(payload = {}) {
      if (!openai) {
        throw new Error('OpenAI non configurato');
      }

      const messages = payload?.messages || [
        {
          role: 'system',
          content: 'Prepari un input strutturato per Replicate. Restituisci solo JSON.',
        },
        {
          role: 'user',
          content: 'Esempio di prompt mancante. Fornisci struttura quando disponibile.',
        },
      ];

      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages,
        temperature: 0.4,
      });

      return response.choices?.[0]?.message?.content || '';
    },

    async describeImage({ dataUri, guideline, tone }) {
      if (!openai) {
        throw new Error('OpenAI non configurato');
      }

      const system = `Sei un copywriter per schede prodotto e social. Restituisci JSON con due campi: title (max 6 parole) e description (4-6 frasi) rispettando le linee guida scelte: ${guideline || 'e-commerce'}. Mantieni tono ${tone || 'premium editoriale'}.`;
      const user = 'Genera titolo breve e descrizione per questa immagine.';

      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: [
              { type: 'text', text: user },
              { type: 'image_url', image_url: { url: dataUri } },
            ],
          },
        ],
        temperature: 0.7,
      });

      return response.choices?.[0]?.message?.content || '';
    },

    async generateImage({ prompt, size, image }) {
      if (!openai) {
        throw new Error('OpenAI non configurato');
      }

      const options = {
        model: OPENAI_IMAGE_MODEL,
        prompt,
        size,
        response_format: 'b64_json',
      };

      if (image) {
        options.image = image;
      }

      const response = await openai.images.generate(options);
      return response.data?.[0]?.b64_json || '';
    },
  };
}

module.exports = {
  createOpenAIIntegration,
};
