const https = require('https');
const http = require('http');

const GOOGLE_MODEL_ID = 'gemini-3.1-flash-image-preview';

function fetchUrlAsBase64(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const mimeType = response.headers['content-type'] || 'image/jpeg';
        resolve({ data: buffer.toString('base64'), mimeType });
      });
      response.on('error', reject);
    }).on('error', reject);
  });
}

function createGoogleIntegration(deps) {
  const { GOOGLE_AI_KEY } = deps;

  let googleClient = null;
  if (GOOGLE_AI_KEY) {
    try {
      const { GoogleGenAI } = require('@google/genai');
      googleClient = new GoogleGenAI({ apiKey: GOOGLE_AI_KEY });
    } catch (_err) {
      googleClient = null;
    }
  }

  return {
    isConfigured() {
      return !!googleClient && !!GOOGLE_AI_KEY;
    },

    async runModel(_modelId, input) {
      if (!googleClient) {
        throw new Error('Google AI non configurato: aggiungi GOOGLE_AI_KEY in .env');
      }

      const parts = [{ text: input.prompt }];

      // Aggiungi le immagini come inline data (base64)
      // Gestisce sia data URI che URL https://
      if (Array.isArray(input.image_input)) {
        for (const img of input.image_input) {
          const dataMatch = img.match(/^data:([^;]+);base64,(.+)$/);
          if (dataMatch) {
            parts.push({ inlineData: { mimeType: dataMatch[1], data: dataMatch[2] } });
          } else if (img.startsWith('http://') || img.startsWith('https://')) {
            try {
              const inlineData = await fetchUrlAsBase64(img);
              parts.push({ inlineData });
            } catch (_err) {
              // ignora immagine non scaricabile
            }
          }
        }
      }

      const aspectRatio = input.aspect_ratio || '1:1';
      const imageSize = ['1K', '2K', '4K', '0.5K'].includes(input.resolution)
        ? input.resolution
        : '1K';

      const response = await googleClient.models.generateContent({
        model: GOOGLE_MODEL_ID,
        contents: [{ role: 'user', parts }],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { aspectRatio, imageSize },
        },
      });

      // Estrai immagini dalla risposta (restituite come base64)
      const images = [];
      for (const candidate of response.candidates || []) {
        for (const part of candidate.content?.parts || []) {
          if (part.inlineData?.data) {
            const mimeType = part.inlineData.mimeType || 'image/jpeg';
            images.push(`data:${mimeType};base64,${part.inlineData.data}`);
          }
        }
      }

      if (images.length > 0) return images;
      throw new Error('Google AI: nessuna immagine ricevuta nella risposta');
    },
  };
}

module.exports = { createGoogleIntegration };
