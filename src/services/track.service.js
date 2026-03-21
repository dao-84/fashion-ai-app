function createServiceError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  if (details !== undefined) error.details = details;
  return error;
}

function normalizeString(value, fieldName) {
  if (typeof value !== 'string') {
    throw createServiceError(400, `Invalid ${fieldName}`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw createServiceError(400, `Missing ${fieldName}`);
  }
  return trimmed;
}

function createTrackService() {
  return {
    track(payload = {}) {
      const sessionId = normalizeString(payload.sessionId, 'sessionId');
      const eventName = normalizeString(payload.eventName, 'eventName');
      const timestamp = normalizeString(payload.timestamp, 'timestamp');
      const page = normalizeString(payload.page, 'page');

      const metadata = payload.metadata === undefined ? {} : payload.metadata;
      if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
        throw createServiceError(400, 'Invalid metadata');
      }

      const event = {
        sessionId,
        eventName,
        timestamp,
        page,
        metadata,
      };

      console.log(`TRACK_EVENT ${JSON.stringify(event)}`);
      return { ok: true };
    },
  };
}

module.exports = {
  createTrackService,
};
