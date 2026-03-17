// Future user model placeholder.
// Keeps a technology-agnostic contract until a real ORM/ODM is chosen.

const userModel = {
  entity: 'User',
  key: 'id',
  fields: ['id', 'email', 'role', 'status', 'profile', 'createdAt', 'updatedAt'],
};

module.exports = {
  userModel,
};
