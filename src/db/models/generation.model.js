// Future generation model placeholder.
// Intended for generated asset metadata, ownership, prompts, and billing linkage.

const generationModel = {
  entity: 'Generation',
  key: 'id',
  fields: ['id', 'userId', 'prompt', 'assetUrl', 'provider', 'status', 'cost', 'createdAt'],
};

module.exports = {
  generationModel,
};
