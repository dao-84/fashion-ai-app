function createProxyIntegration(deps) {
  const { fetch, API_BASE_URL, API_KEY } = deps;

  return {
    isConfigured() {
      return !!(API_BASE_URL && API_KEY);
    },

    async generate(payload = {}) {
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const body = isJson ? await response.json() : await response.text();

      return {
        ok: response.ok,
        status: response.status,
        isJson,
        body,
      };
    },
  };
}

module.exports = {
  createProxyIntegration,
};
