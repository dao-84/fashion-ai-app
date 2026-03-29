let stripeInstance = null;

function getStripe() {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY non configurata');
    const Stripe = require('stripe');
    stripeInstance = new Stripe(key, { apiVersion: '2024-04-10' });
  }
  return stripeInstance;
}

function isConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

const PRICE_IDS = {
  starter_monthly:    () => process.env.STRIPE_PRICE_STARTER_MONTHLY,
  starter_annual:     () => process.env.STRIPE_PRICE_STARTER_ANNUAL,
  pro_monthly:        () => process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_annual:         () => process.env.STRIPE_PRICE_PRO_ANNUAL,
  enterprise_monthly: () => process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
  enterprise_annual:  () => process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
  credits_10:         () => process.env.STRIPE_PRICE_CREDITS_10,
  credits_50:         () => process.env.STRIPE_PRICE_CREDITS_50,
  credits_100:        () => process.env.STRIPE_PRICE_CREDITS_100,
};

// Mappa Price ID → piano e crediti (usata nel webhook)
const PRICE_TO_PLAN = {
  get starter_monthly()    { return { plan: 'starter',    credits: 30,  type: 'subscription' }; },
  get starter_annual()     { return { plan: 'starter',    credits: 30,  type: 'subscription' }; },
  get pro_monthly()        { return { plan: 'pro',        credits: 150, type: 'subscription' }; },
  get pro_annual()         { return { plan: 'pro',        credits: 150, type: 'subscription' }; },
  get enterprise_monthly() { return { plan: 'enterprise', credits: 500, type: 'subscription' }; },
  get enterprise_annual()  { return { plan: 'enterprise', credits: 500, type: 'subscription' }; },
  get credits_10()         { return { plan: null,         credits: 10,  type: 'one_time' }; },
  get credits_50()         { return { plan: null,         credits: 50,  type: 'one_time' }; },
  get credits_100()        { return { plan: null,         credits: 100, type: 'one_time' }; },
};

function getPlanFromPriceId(priceId) {
  for (const [key, getter] of Object.entries(PRICE_IDS)) {
    if (getter() === priceId) return PRICE_TO_PLAN[key];
  }
  return null;
}

function getPriceId(key) {
  const getter = PRICE_IDS[key];
  if (!getter) return null;
  return getter() || null;
}

module.exports = { getStripe, isConfigured, getPriceId, getPlanFromPriceId };
