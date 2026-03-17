function successResponse(data = null, meta = undefined) {
  const response = {
    ok: true,
    data,
  };

  if (meta !== undefined) {
    response.meta = meta;
  }

  return response;
}

function errorResponse(message, options = {}) {
  const { code = 'INTERNAL_ERROR', details } = options;
  const response = {
    ok: false,
    error: message,
    code,
  };

  if (details !== undefined) {
    response.details = details;
  }

  return response;
}

module.exports = {
  successResponse,
  errorResponse,
};
