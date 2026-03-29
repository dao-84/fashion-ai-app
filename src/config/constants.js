// Crediti assegnati all'utente alla registrazione (piano Free, una tantum)
const FREE_CREDITS_ON_REGISTER = 12;

// Regole per piano — fonte: docs/PRICING.md
const PLANS = {
  free: {
    credits: 12,
    renewMonthly: false,                  // crediti una tantum, non si rinnovano
    resolutions: ['1K'],
    creditCost: { '1K': 1, '2K': 1.5, '4K': 2 },
    listingGeneratorCost: 0.5,            // in crediti (0 = gratuito)
    customModel: false,
    customBackground: true,
    priorityGeneration: false,
    batch: { available: false, comingSoon: false },
    apiAccess: { available: false, comingSoon: false },
    teamAccounts: { available: false, comingSoon: false },
  },
  starter: {
    credits: 30,
    renewMonthly: true,
    resolutions: ['1K'],
    styles: ['ecommerce', 'minimal', 'ghostMannequin'],
    creditCost: { '1K': 1, '2K': 1.5, '4K': 2 },
    listingGeneratorCost: 0.5,
    customModel: false,
    customBackground: true,
    priorityGeneration: false,
    batch: { available: false, comingSoon: false },
    apiAccess: { available: false, comingSoon: false },
    teamAccounts: { available: false, comingSoon: false },
  },
  pro: {
    credits: 150,
    renewMonthly: true,
    resolutions: ['1K', '2K', '4K'],
    creditCost: { '1K': 1, '2K': 1.5, '4K': 2 },
    listingGeneratorCost: 0,
    customModel: true,
    customBackground: true,
    priorityGeneration: true,
    batch: { available: false, comingSoon: false },
    apiAccess: { available: false, comingSoon: false },
    teamAccounts: { available: false, comingSoon: false },
  },
  enterprise: {
    credits: 500,
    renewMonthly: true,
    resolutions: ['1K', '2K', '4K'],
    creditCost: { '1K': 1, '2K': 1.5, '4K': 2 },
    listingGeneratorCost: 0,
    customModel: true,
    customBackground: true,
    priorityGeneration: true,
    batch: { available: false, comingSoon: true },
    apiAccess: { available: false, comingSoon: true },
    teamAccounts: { available: false, comingSoon: true },
  },
};

const DEFAULTS = {
  port: 3000,
  openaiModel: 'gpt-4o-mini',
  openaiImageModel: 'gpt-image-1.5-2025-12-16',
  replicateModelVersion:
    'google/nano-banana:f0a9d34b12ad1c1cd76269a844b218ff4e64e128ddaba93e15891f47368958a0',
  replicateModelVersionIdentity:
    'prunaai/z-image-turbo:7ea16386290ff5977c7812e66e462d7ec3954d8e007a8cd18ded3e7d41f5d7cf',
};

const DEFAULT_MODEL_BASE_PROMPT =
  'fashion model portfolio photo, full body studio shot, neutral grey background, fair skin, minimal makeup, wearing simple blue jeans and plain white t-shirt, confident relaxed pose, soft studio lighting, professional fashion photography, casting portfolio style, ultra realistic, clean studio lighting, fashion casting sheet style, 85mm lens, fashion editorial photography, high detail skin texture';

module.exports = {
  DEFAULTS,
  DEFAULT_MODEL_BASE_PROMPT,
  FREE_CREDITS_ON_REGISTER,
  PLANS,
};
