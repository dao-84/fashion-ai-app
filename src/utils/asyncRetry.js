function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryAsync(operation, options = {}) {
  const {
    maxAttempts = 3,
    delaysMs = [2000, 5000],
    shouldRetry = () => false,
    onRetry,
    onGiveUp,
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      const canRetry = attempt < maxAttempts && shouldRetry(error, attempt);

      if (!canRetry) {
        if (onGiveUp) {
          await onGiveUp(error, attempt);
        }
        throw lastError;
      }

      const delayMs = delaysMs[attempt - 1] ?? delaysMs[delaysMs.length - 1] ?? 0;
      if (onRetry) {
        await onRetry(error, attempt, delayMs);
      }
      if (delayMs > 0) {
        await wait(delayMs);
      }
    }
  }

  throw lastError;
}

module.exports = {
  retryAsync,
};
