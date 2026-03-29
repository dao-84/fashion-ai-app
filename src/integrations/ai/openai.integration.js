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

    async describeImage({ dataUri, style, userText, language }) {
      if (!openai) {
        throw new Error('OpenAI non configurato');
      }

      const langMap = { it: 'italiano', en: 'English', es: 'español' };
      const lang = langMap[language] || 'italiano';
      const langInstruction = `Genera TUTTO l'output nella seguente lingua: ${lang}. Usa terminologia moda appropriata per il mercato ${lang}. Adatta keyword e riferimenti culturali al mercato di riferimento.`;

      const STYLE_PROMPTS = {
        ecommerce: `Sei un copywriter esperto di moda e SEO per e-commerce. Ricevi un'immagine di un capo di abbigliamento. ANALIZZA l'immagine per identificare tipologia, colore, tessuto apparente, dettagli costruttivi, vestibilità e stagionalità. GENERA la risposta ESCLUSIVAMENTE in questo formato JSON (nessun testo fuori dal JSON): {"title": "Nome prodotto ottimizzato SEO, max 80 caratteri. Includi: tipologia + materiale + dettaglio distintivo.", "description": "2-3 paragrafi separati da \\n\\n. Paragrafo 1: appeal emozionale e occasione d'uso. Paragrafo 2: dettagli tecnici (tessuto, vestibilità, costruzione). Paragrafo 3 opzionale: consigli di styling.", "bullet_points": ["5-7 punti. Ogni punto inizia con un aspetto: Tessuto:, Vestibilità:, Chiusura:, Dettagli:, Lavaggio:, Occasione:"], "keywords_seo": ["8-12 keyword rilevanti, mix di generiche e specifiche"]}. REGOLE: mai inventare composizioni tessuto, usa terminologia moda corretta, non usare superlativi inflazionati.`,

        social: `Sei un social media manager esperto di moda e content creation. Ricevi un'immagine di un capo di abbigliamento. ANALIZZA tipologia, colori dominanti, mood visivo e contesto d'uso ideale. GENERA la risposta ESCLUSIVAMENTE in questo formato JSON: {"title": "Hook per caption, max 10 parole. Domanda o affermazione d'impatto.", "description": "Caption Instagram coinvolgente, max 150 parole. Struttura: hook iniziale + corpo emozionale (racconta il capo come esperienza) + call-to-action. Usa emoji con moderazione (max 3-4). Vai a capo per leggibilità.", "hashtag": ["15-20 hashtag. Mix di: 3-4 ad alto volume, 5-6 di nicchia, 3-4 specifici del capo"]}. REGOLE: il caption deve funzionare anche senza hashtag, non usare cliché inflazionati, gli hashtag devono essere reali e attivi.`,

        editorial: `Sei un direttore creativo e copywriter editoriale di alta moda. Ricevi un'immagine di un capo di abbigliamento. ANALIZZA silhouette, palette cromatica, qualità percepita, riferimenti stilistici e mood complessivo. GENERA la risposta ESCLUSIVAMENTE in questo formato JSON: {"title": "Titolo editoriale evocativo, max 8 parole. Non descrittivo ma suggestivo.", "description": "3-4 paragrafi di prosa editoriale raffinata, separati da \\n\\n. Tono: rivista di moda di alto livello. Non descrivere il capo come scheda tecnica: racconta una storia, evoca un'atmosfera. Max 250 parole totali.", "quote": "Una frase singola, potente e memorabile, max 20 parole. Funziona come pull-quote su una pagina di rivista."}. REGOLE: mai linguaggio commerciale, mai bullet points, tono colto ma accessibile, evita anglicismi forzati.`,

        marketplace: `Sei un esperto di ottimizzazione listing per marketplace fashion (Amazon, Zalando, Etsy). Ricevi un'immagine di un capo di abbigliamento. ANALIZZA tipologia precisa, colore standard, tessuto e caratteristiche ricercabili. GENERA la risposta ESCLUSIVAMENTE in questo formato JSON: {"title": "Titolo strutturato per massima visibilità, max 150 caratteri. Formula: Tipo Capo + Materiale + Dettaglio Chiave + Colore + Target.", "description": "Descrizione ottimizzata, max 400 caratteri. Paragrafo presentazione capo + punti di forza principali. Ripeti le keyword principali 2-3 volte in modo naturale.", "bullet_points": ["5 punti secchi e informativi. Formato: ASPETTO: dettaglio. Es: MATERIALE: 100% lino, VESTIBILITÀ: Regular fit, CHIUSURA: Zip laterale, CURA: Lavabile 30°, OCCASIONE: Cerimonie estive"]}. REGOLE: colori in termini standard (no colori poetici), linguaggio informativo e pragmatico, no linguaggio emozionale.`,
      };

      const systemPrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.ecommerce;
      const userInfo = userText ? `\n\nINFORMAZIONI PRODOTTO DALL'UTENTE (hanno priorità sull'analisi visiva):\n${userText}` : '';
      const user = `Analizza questa immagine fashion e genera il copy richiesto.${userInfo}\n\n${langInstruction}`;

      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: dataUri } },
              { type: 'text', text: user },
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
