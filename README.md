# Fashion AI - Virtual Photoshoot

Strumento AI per generare immagini editoriali di capi di abbigliamento su modella.
Carica la foto del capo, scegli la modella e ottieni scatti pronti per e-commerce, lookbook e ADV in pochi secondi.

## Funzionalita

- Genera look da capo + modella
- Genera modella AI
- Upscale delle immagini generate
- Refine di immagini esistenti
- Gallery locale degli output
- Titolo e descrizione per publish

## Stack

- Node.js + Express
- Frontend HTML/CSS/JS statico
- Replicate API
- OpenAI API
- Google Gemini API opzionale

## Avvio locale

```bash
git clone https://github.com/dao-84/Fashion-Ai.git
cd Fashion-Ai
npm install
cp .env.example .env
npm start
```

App disponibile su `http://localhost:3000`.

## Variabili ambiente

Copia `.env.example` in `.env` e compila solo le variabili che ti servono.

```env
PORT=3000
REPLICATE_API_TOKEN=
OPENAI_API_KEY=
GOOGLE_API_KEY=
BETA_TOKEN=
PUBLIC_BASE_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
API_BASE_URL=
API_KEY=
```

Note:
- `REPLICATE_API_TOKEN` e necessario per la generazione immagini con Replicate.
- `OPENAI_API_KEY` serve per prompt/descrizioni.
- `GOOGLE_API_KEY` e opzionale.
- `BETA_TOKEN` protegge le route API in beta.
- `PUBLIC_BASE_URL` va impostato a un URL pubblico reale quando un provider esterno deve raggiungere asset serviti dall'app.

## Deploy

Su Railway:
1. fai push del codice su GitHub
2. collega il repository
3. configura le variabili ambiente
4. genera il dominio pubblico

## Accesso beta

Se `BETA_TOKEN` e impostato sul backend, il frontend richiede il codice beta al primo accesso API e lo salva in `sessionStorage`.
Il valore deve corrispondere a `BETA_TOKEN`.

## Storage e note operative

- Le immagini generate sono salvate in `storage/generated/`
- Gli asset generati sono esposti pubblicamente tramite `/generated`
- La vecchia cartella root `generated/` e legacy e non deve piu essere usata come storage attivo
- Il file `.env` non va mai caricato su GitHub

## Stato progetto

Refactor strutturale completato. Base pronta per evoluzioni future su auth, DB, billing e credits.
