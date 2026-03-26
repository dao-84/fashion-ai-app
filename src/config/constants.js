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
};
