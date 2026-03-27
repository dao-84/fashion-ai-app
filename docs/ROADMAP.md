# Fashion AI — Roadmap di lancio

> Ultimo aggiornamento: Marzo 2026
> Stato: FASE 00 — Preparazione

## Come usare questo file
- Claude Code legge questo file all'inizio di ogni sessione
- ✅ completato | ⬜ da fare | 🔄 in corso
- Aggiorna i simboli quando completi un task (chiedi conferma prima)
- Non saltare fasi: ogni fase dipende dalla precedente

---

## FASE 00 — Analisi, infrastruttura provider e preparazione
**Durata:** 1-2 settimane | **Costo:** €0 | **Priorità:** massima

### 00.1 — Analisi codice (PRIMO PASSO IN ASSOLUTO)
- ✅ Analizzare il codice locale e confrontarlo con la versione su GitHub — individuare differenze e possibili problemi
- ✅ Verificare che il progetto si avvii correttamente in locale (`npm start`)
- ✅ Documentare eventuali errori o warning nello startup

### 00.2 — Integrazione FAL.AI come provider alternativo
Replicate presenta problemi di affidabilità ("service busy"). FAL.AI serve lo stesso modello (Nano Banana 2) con infrastruttura più stabile e zero cold start. Entrambi i provider devono coesistere con un selettore nel frontend per confrontare qualità, velocità e affidabilità.

- ✅ Installare `@fal-ai/client` come dipendenza npm
- ✅ Creare `src/integrations/ai/fal.integration.js` (stessa interfaccia di replicate.integration.js: `isConfigured()`, `runModel()`)
- ✅ Aggiornare `app.js` per inizializzare entrambi i provider (Replicate + FAL.AI)
- ✅ Modificare la route `/api/generate` per accettare un parametro `provider` ("replicate" o "fal")
- ✅ Aggiungere un selettore provider nel frontend dello studio (dropdown o toggle Replicate / FAL.AI)
- ✅ Aggiungere `FAL_KEY` al `.env` e alle variabili ambiente su Railway
- ✅ Testare entrambi con gli stessi prompt e confrontare risultati — FAL.AI funziona con modello `fal-ai/nano-banana-2/edit`, immagini input caricate su R2
- ✅ Decisione provider: tenere entrambi in parallelo — FAL.AI come alternativa stabile a Replicate

### 00.3 — Pulizia codice legacy
- ✅ Rimuovere upscale dal backend (route `/api/upscale`, controller, service)
- ✅ Rimuovere refine dal backend (route `/api/refine`, controller, service)
- ✅ Rimuovere integrazione Gemini (gemini.integration.js, riferimenti in app.js, config/env.js, config/constants.js)
- ✅ Rimuovere upscale/refine dal frontend (bottoni, UI, chiamate API)
- ✅ Verificare che tutto funzioni dopo la rimozione

### 00.4 — Selezione risoluzione
- ✅ Implementare parametro risoluzione (1K/2K/4K) nella chiamata al provider attivo (Replicate e/o FAL.AI) nel backend
- ✅ Implementare UI selezione risoluzione nel frontend (studio.html)
- ✅ Testare le 3 risoluzioni su Replicate: **1K funziona**, 2K e 4K falliscono con timeout (httpx.ReadTimeout lato Replicate — il modello usa Gemini Flash internamente e va in timeout per immagini grandi). Aggiunto avviso sperimentale nel frontend per 2K/4K.
- ✅ **Testare 2K e 4K con FAL.AI**: risoluzioni 1K/2K/4K funzionanti su FAL.AI. FAL.AI impostato come provider di default.

### 00.5 — Preparazione lancio
- ✅ Waitlist: form interno per raccogliere email — collegato ad Airtable, funzionante
- ✅ Pagina pricing statica (pricing.html) con 4 piani — multilingua IT/EN/ES con switcher lingua
- ✅ Lingua interfaccia: default italiano, selettore IT/EN/ES (localStorage) su tutte le pagine
- ✅ Sistema i18n condiviso (i18n.js) — tutte le pagine tradotte in IT/EN/ES (index, studio, gallery, pricing, privacy, terms, cookies)
- ✅ cookies.html creata — link footer non dà più 404
- ✅ Copy IT e ES riscritto per la conversione — testi non più traduzione letterale ma adattati per ogni lingua (hero, problem/solution, vantaggi, FAQ, CTA)
- ✅ Waitlist: modal con form Nome + Email, collegato ad Airtable (IT/EN/ES, fonte tracciata) — tabella Airtable creata e pronta a ricevere iscrizioni
- ⬜ Generare 20-30 immagini showcase per la gallery pubblica — posticipato a dopo FASE 01 (richiede storage S3/R2 per URL pubblici)

---

## FASE 01 — Infrastruttura dati
**Durata:** 2-3 settimane | **Costo:** ~€1-5/mese

- ✅ Aggiungere PostgreSQL su Railway
- ✅ Installare dipendenza `pg`
- ✅ Creare schema database: users, generations, credit_transactions
- ✅ Collegare il database (connection.js → implementazione reale)
- ✅ Configurare storage Cloudflare R2 per immagini persistenti
- ✅ Migrare imageHelpers.js per salvare su R2 (con fallback locale)
- ✅ Migrare gallery.service.js per eliminare da R2 al delete
- ✅ Attivare feature flag `enableDatabase`
- ✅ **Attivare FAL.AI**: rimosso blocco in studio.html, aggiornato `fal.integration.js` con `image_urls`, upload automatico su R2 prima di chiamare FAL.AI. Modello attivo: `fal-ai/nano-banana-2/edit`.

---

## FASE 02 — Autenticazione utenti
**Durata:** 2-3 settimane | **Costo:** €0

- ✅ Installare bcrypt, jsonwebtoken
- ✅ Implementare POST /api/auth/register
- ✅ Implementare POST /api/auth/login
- ✅ Completare auth.middleware.js (verifica JWT)
- ✅ Trasformare modal beta-guard in form login/registrazione (con tab Accedi/Registrati, X per chiudere, fetch interceptor JWT)
- ✅ Link "Accedi" nelle navbar aggiornati con data-auth-link (index, studio, gallery, pricing)
- ✅ Assegnare crediti Free (3) alla registrazione
- ✅ Attivare feature flag `enableAuth`
- ✅ JWT_SECRET aggiunta in .env e su Railway
- ⬜ Creare pagina profilo utente (profile.html) — posticipato a dopo FASE 03
- ⬜ (Opzionale) Reset password via email

---

## FASE 03 — Sistema crediti
**Durata:** 1-2 settimane | **Costo:** €0

- ⬜ Completare credit.service.js con query database reali
- ⬜ Definire piani in config/constants.js con tutte le regole:
  - Stili disponibili per piano
  - Risoluzioni disponibili per piano
  - Costo crediti per risoluzione per piano
  - Limite modelle personalizzate per piano
  - Listing Generator (sì/no per piano)
  - Batch (sì/no e limiti per piano)
- ⬜ Check crediti in generation.service.js prima di chiamare il provider
- ⬜ Scalare crediti dopo generazione (1/2/3 in base a risoluzione e piano)
- ⬜ Logica sblocco stili per piano nel frontend
- ⬜ Logica sblocco risoluzioni per piano nel frontend
- ⬜ Limite generazione modelle per piano
- ⬜ Reset crediti a fine mese (job o check al login)
- ⬜ Pacchetti crediti extra (10=€5, 50=€22, 100=€39)
- ⬜ Mostrare saldo crediti nella navbar (sostituire "€50,00")
- ⬜ Avviso crediti in esaurimento
- ⬜ Attivare feature flag `enableCredits`

---

## FASE 04 — Pagamenti con Stripe
**Durata:** 2-3 settimane | **Costo:** Stripe 1.4% + €0.25/tx

- ⬜ Creare account Stripe, chiavi API test
- ⬜ Installare dipendenza `stripe`
- ⬜ Creare prodotti su Stripe: 3 piani abbonamento + 3 pacchetti crediti
- ⬜ POST /api/billing/checkout (sessione Stripe Checkout)
- ⬜ POST /api/billing/webhook (eventi Stripe)
- ⬜ Gestire checkout.session.completed → aggiungere crediti
- ⬜ Gestire customer.subscription.deleted → downgrade a Free
- ⬜ Gestire invoice.payment_failed → notifica utente
- ⬜ Pagina pricing funzionante con bottoni Stripe
- ⬜ Stripe Customer Portal per gestione abbonamento
- ⬜ Attivare feature flag `enableBilling`
- ⬜ TEST COMPLETO con carte test (4242..., 4000...0002, 4000...3155)

---

## FASE 05 — Sicurezza e legale
**Durata:** 1 settimana | **Costo:** €0-50

- ⬜ Installare helmet.js
- ⬜ Rate limiting per utente autenticato
- ⬜ Verificare privacy.html GDPR
- ⬜ Aggiornare terms.html per SaaS a pagamento
- ✅ cookies.html creata (completata in FASE 00.5)
- ⬜ Cookie banner (CookieConsent.js)
- ⬜ Verificare log non espongano dati sensibili

---

## FASE 06 — Differenziazione prodotto
**Durata:** 2-3 settimane | **Costo:** ~€0.01/chiamata OpenAI

- ⬜ Collegare Listing Generator al workflow studio
- ⬜ Output multilingua listing (IT/ES/FR)
- ⬜ Esportazione Shopify CSV (piano Business)
- ⬜ Demo pubblica: 1 generazione gratis senza login
- ⬜ Scena custom (solo piano Pro+)
- ⬜ Batch generation (Pro max 5/mese, Business illimitato)
- ⬜ (Opzionale) Preset scene europee
- ⬜ (Opzionale) Sistema i18n interfaccia multilingua

---

## FASE 07 — Pre-lancio e marketing
**Durata:** 2-3 settimane (parallelo con fase 06) | **Nessun codice**

- ⬜ Identificare 30 brand su Instagram
- ⬜ DM personalizzati
- ⬜ Onboarding 1-a-1 con chi accetta
- ⬜ Feedback dopo 4 settimane
- ⬜ Raccogliere testimonianze
- ⬜ 2-3 video YouTube in italiano
- ⬜ Post per gruppi Facebook venditori
- ⬜ Landing page con testimonianze e countdown

---

## FASE 08 — Lancio
**Durata:** 1 settimana

- ⬜ Stripe in modalità produzione
- ⬜ Test pagamento reale
- ⬜ Email alla waitlist
- ⬜ Attivare brand pilota (Pro gratuito)
- ⬜ Post lancio social
- ⬜ Monitoraggio log + Stripe + feedback
- ⬜ Supporto WhatsApp attivo

---

## Timeline

| Fase | Durata | Dipende da |
|------|--------|------------|
| 00 Analisi + FAL.AI + pulizia + preparazione | 1-2 settimane | — |
| 01 Database + S3 | 2-3 settimane | 00 |
| 02 Auth | 2-3 settimane | 01 |
| 03 Crediti | 1-2 settimane | 02 |
| 04 Stripe | 2-3 settimane | 03 |
| 05 Sicurezza | 1 settimana | 04 |
| 06 Listing Generator | 2-3 settimane | 02 (parallelo con 04-05) |
| 07 Pre-lancio | 2-3 settimane | 06 |
| 08 Lancio | 1 settimana | 07 |

**Timeline totale: 3-4 mesi**

---

## Note provider AI

### Provider attivi
- **Replicate** — provider attuale, modello Nano Banana 2. Problemi di affidabilità ("service busy")
- **FAL.AI** — provider alternativo in fase di test. Stesso modello Nano Banana 2, infrastruttura più stabile

### Costi per generazione (Nano Banana 2)

| Risoluzione | Replicate | FAL.AI |
|---|---|---|
| 1K | €0.10 | ~€0.08 |
| 2K | €0.12 | ~€0.12 |
| 4K | €0.18 | ~€0.16 |

### Decisione provider
La scelta definitiva verrà fatta dopo il periodo di test nella Fase 00. Il selettore frontend permette di confrontare in tempo reale. Possibili esiti:
1. FAL.AI diventa principale, Replicate fallback
2. Replicate resta principale se i problemi si risolvono
3. Si tiene il dual-provider permanentemente
