const { getStripe, getPriceId, getPlanFromPriceId } = require('../integrations/billing/stripe.integration');

function createServiceError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Crediti assegnati al rinnovo mensile per piano
const PLAN_CREDITS = {
  starter:    30,
  pro:        150,
  enterprise: 500,
  free:       0,
};

function createBillingService({ getPool, log, logEmoji, creditService, telegramBotToken, telegramChatId }) {
  const pool = () => getPool();

  async function notifyTelegram(text) {
    if (!telegramBotToken || !telegramChatId) return;
    try {
      await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramChatId, text }),
      });
    } catch (_err) {}
  }

  return {
    async createCheckoutSession({ userId, userEmail, priceKey, successUrl, cancelUrl }) {
      const stripe = getStripe();
      const priceId = getPriceId(priceKey);
      if (!priceId) throw createServiceError(400, 'Piano non valido');

      const planInfo = getPlanFromPriceId(priceId);
      const isSubscription = planInfo?.type === 'subscription';

      // Cerca o crea il customer Stripe per questo utente
      let customerId = null;
      try {
        const db = pool();
        const res = await db.query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]);
        customerId = res.rows[0]?.stripe_customer_id || null;
      } catch (_) {}

      if (!customerId) {
        const customer = await stripe.customers.create({ email: userEmail, metadata: { userId: String(userId) } });
        customerId = customer.id;
        try {
          await pool().query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, userId]);
        } catch (_) {}
      }

      const sessionParams = {
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: isSubscription ? 'subscription' : 'payment',
        success_url: `${successUrl}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        metadata: { userId: String(userId), priceKey },
        locale: 'it',
      };

      const session = await stripe.checkout.sessions.create(sessionParams);
      return { url: session.url };
    },

    async createPortalSession({ userId, returnUrl }) {
      const stripe = getStripe();
      const db = pool();
      const res = await db.query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]);
      const customerId = res.rows[0]?.stripe_customer_id;
      if (!customerId) throw createServiceError(404, 'Nessun abbonamento attivo trovato');

      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      return { url: session.url };
    },

    async handleWebhook({ rawBody, signature }) {
      const stripe = getStripe();
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) throw createServiceError(500, 'STRIPE_WEBHOOK_SECRET non configurato');

      let event;
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch (err) {
        throw createServiceError(400, `Webhook signature non valida: ${err.message}`);
      }

      const db = pool();

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const userId = parseInt(session.metadata?.userId, 10);
          if (!userId) break;

          const priceKey = session.metadata?.priceKey;
          const planInfo = priceKey ? getPlanFromPriceId(getPriceId(priceKey)) : null;
          if (!planInfo) break;

          if (planInfo.type === 'subscription') {
            // Aggiorna piano, subscription ID e somma i crediti piano ai crediti esistenti
            await db.query(
              'UPDATE users SET plan = $1, credits_plan = credits_plan + $2, stripe_subscription_id = $3 WHERE id = $4',
              [planInfo.plan, planInfo.credits, session.subscription || null, userId]
            );
            log.info(logEmoji.auth, `[billing] piano aggiornato a ${planInfo.plan} per utente ${userId}, +${planInfo.credits} credits_plan`);
            const now = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
            notifyTelegram(`💳 Nuovo abbonamento attivato\n👤 Utente ID: ${userId}\n📋 Piano: ${planInfo.plan}\n💰 Crediti aggiunti: ${planInfo.credits}\n📅 ${now}`).catch(() => {});
          } else {
            // Pacchetto crediti one-time — aggiunge a credits_pack (non scadono mai)
            await db.query(
              'UPDATE users SET credits_pack = credits_pack + $1 WHERE id = $2',
              [planInfo.credits, userId]
            );
            log.info(logEmoji.auth, `[billing] +${planInfo.credits} credits_pack per utente ${userId}`);
            const now = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
            notifyTelegram(`📦 Acquisto pacchetto crediti\n👤 Utente ID: ${userId}\n💰 Crediti aggiunti: ${planInfo.credits}\n📅 ${now}`).catch(() => {});
          }

          // Registra transazione
          await db.query(
            'INSERT INTO credit_transactions (user_id, amount, description) VALUES ($1, $2, $3)',
            [userId, planInfo.credits, planInfo.type === 'subscription' ? `Piano ${planInfo.plan} attivato` : `Pacchetto ${planInfo.credits} crediti`]
          ).catch(() => {});
          break;
        }

        case 'invoice.paid': {
          // Rinnovo mensile — resetta crediti piano
          const invoice = event.data.object;
          const customerId = invoice.customer;
          const subscriptionId = invoice.subscription;
          if (!customerId || invoice.billing_reason !== 'subscription_cycle') break;

          const res = await db.query('SELECT id, plan FROM users WHERE stripe_customer_id = $1', [customerId]);
          if (!res.rows.length) break;
          const user = res.rows[0];
          const credits = PLAN_CREDITS[user.plan] || 0;
          if (!credits) break;

          // Rinnovo: resetta solo credits_plan al valore del piano — credits_pack invariati
          await db.query(
            'UPDATE users SET credits_plan = $1, credits_reset_at = NOW() WHERE id = $2',
            [credits, user.id]
          );
          log.info(logEmoji.auth, `[billing] rinnovo: credits_plan = ${credits} per utente ${user.id} (piano ${user.plan})`);
          const now = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
          notifyTelegram(`🔄 Rinnovo abbonamento\n👤 Utente ID: ${user.id}\n📋 Piano: ${user.plan}\n💰 Crediti rinnovati: ${credits}\n📅 ${now}`).catch(() => {});
          break;
        }

        case 'customer.subscription.deleted': {
          // Abbonamento cancellato → downgrade a Free — i crediti rimangono invariati
          const subscription = event.data.object;
          const customerId = subscription.customer;
          await db.query(
            'UPDATE users SET plan = $1, stripe_subscription_id = NULL WHERE stripe_customer_id = $2',
            ['free', customerId]
          );
          log.info(logEmoji.warn, `[billing] abbonamento cancellato per customer ${customerId} → piano free (crediti invariati)`);
          const now = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
          notifyTelegram(`❌ Abbonamento cancellato\n👤 Customer: ${customerId}\n📋 Downgrade a: Free\n📅 ${now}`).catch(() => {});
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          log.warn(logEmoji.warn, `[billing] pagamento fallito per customer ${invoice.customer}`);
          break;
        }

        default:
          break;
      }

      return { received: true };
    },
  };
}

module.exports = { createBillingService };
