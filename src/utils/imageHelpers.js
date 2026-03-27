function parseDimensions(aspect = '1:1') {
  const presets = {
    '1:1': { width: 1024, height: 1024 },
    '3:4': { width: 768, height: 1024 },
    '4:3': { width: 1024, height: 768 },
    '9:16': { width: 768, height: 1365 },
    '16:9': { width: 1365, height: 768 },
  };
  return presets[aspect] || presets['1:1'];
}

function resolveLocalImagePath(item, deps) {
  const { fs, path, publicDir, galleryDir } = deps;

  if (typeof item !== 'string' || !item) return null;

  const tryResolvePath = (rawPath) => {
    if (!rawPath) return null;

    const normalizedPath = rawPath.replace(/^\/+/, '').replace(/\//g, path.sep);
    const candidates = [];

    if (normalizedPath === 'generated' || normalizedPath.startsWith(`generated${path.sep}`)) {
      const relativeGeneratedPath = normalizedPath.replace(/^generated[\\\/]?/, '');
      candidates.push(path.join(galleryDir, relativeGeneratedPath));
    }

    candidates.push(path.join(publicDir, normalizedPath));

    for (const candidate of candidates) {
      if (candidate && fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return null;
  };

  if (item.startsWith('http://') || item.startsWith('https://')) {
    try {
      const urlObj = new URL(item);
      if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
        return tryResolvePath(urlObj.pathname);
      }
    } catch (_error) {
      return null;
    }

    return null;
  }

  if (item.startsWith('/')) {
    return tryResolvePath(item);
  }

  if (fs.existsSync(item)) {
    return item;
  }

  return tryResolvePath(item);
}

function normalizeImageInput(item, deps) {
  const { fs, path } = deps;

  if (typeof item !== 'string' || !item) return item;

  if (item.startsWith('data:image/')) {
    return { value: item, sourceType: 'data-uri' };
  }

  const localPath = resolveLocalImagePath(item, deps);
  if (localPath) {
    const buffer = fs.readFileSync(localPath);
    const ext = path.extname(localPath).replace('.', '') || 'png';
    return {
      value: `data:image/${ext};base64,${buffer.toString('base64')}`,
      sourceType: 'local-file',
      sourcePath: localPath,
    };
  }

  if (item.startsWith('http://') || item.startsWith('https://')) {
    try {
      const urlObj = new URL(item);
      if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
        return {
          value: null,
          sourceType: 'invalid-local-url',
          error:
            'Localhost image URLs are not reachable by external providers and could not be resolved from local storage.',
        };
      }
    } catch (_error) {
      // fall through
    }
    return { value: item, sourceType: 'remote-url' };
  }

  if (item.startsWith('/')) {
    return {
      value: null,
      sourceType: 'invalid-local-path',
      error:
        'Local image paths must map to a real local file or a public external URL before being sent to an external provider.',
    };
  }

  if (fs.existsSync(item)) {
    const buffer = fs.readFileSync(item);
    const ext = path.extname(item).replace('.', '') || 'png';
    return {
      value: `data:image/${ext};base64,${buffer.toString('base64')}`,
      sourceType: 'local-file',
      sourcePath: item,
    };
  }

  return {
    value: null,
    sourceType: 'invalid-input',
    error: 'Unsupported image input format.',
  };
}

async function saveOutputItem(item, index, deps) {
  const { fetch, fs, path, galleryDir, log, logEmoji } = deps;
  const r2 = require('../integrations/storage/r2.integration');

  const resolveUrl = (maybe) => {
    if (!maybe) return null;
    if (typeof maybe === 'string') return maybe;
    if (typeof maybe.url === 'function') return maybe.url();
    if (typeof maybe.url === 'string') return maybe.url;
    return null;
  };

  const saveBufferToLocal = async (buffer, mimeType, fallbackExt = 'jpg') => {
    try {
      const safeMime = mimeType || 'application/octet-stream';
      const ext = (safeMime.split('/')[1] || fallbackExt || 'bin').split(';')[0];
      const fileName = `look-${Date.now()}-${index}-${Math.floor(Math.random() * 1e6)}.${ext}`;
      const filePath = path.join(galleryDir, fileName);
      fs.writeFileSync(filePath, buffer);
      log.info(logEmoji.save, `[generate] salvato file: ${filePath}`);

      if (r2.isConfigured()) {
        try {
          const publicUrl = await r2.upload(buffer, fileName, safeMime);
          log.info(logEmoji.save, `[generate] caricato su R2: ${publicUrl}`);
          return publicUrl;
        } catch (uploadError) {
          log.warn(logEmoji.warn, `[generate] upload R2 fallito, uso file locale: ${uploadError.message}`);
        }
      }

      return `/generated/${fileName}`;
    } catch (error) {
      log.warn(logEmoji.warn, `[generate] salvataggio immagine fallito: ${error.message}`);
      return null;
    }
  };

  const directUrl = resolveUrl(item);
  if (typeof directUrl === 'string') {
    if (directUrl.startsWith('http://') || directUrl.startsWith('https://')) {
      try {
        const response = await fetch(directUrl);
        if (!response.ok) {
          throw new Error(`download failed with status ${response.status}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        const mimeType = response.headers.get('content-type') || 'image/jpeg';
        return await saveBufferToLocal(buffer, mimeType);
      } catch (error) {
        log.warn(logEmoji.warn, `[generate] download immagine fallito: ${error.message}`);
        return directUrl;
      }
    }
    item = directUrl;
  } else if (directUrl) {
    item = String(directUrl);
  }

  if (typeof item !== 'string') return null;

  if (item.startsWith('http://') || item.startsWith('https://')) {
    try {
      const response = await fetch(item);
      if (!response.ok) {
        throw new Error(`download failed with status ${response.status}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const mimeType = response.headers.get('content-type') || 'image/jpeg';
      return await saveBufferToLocal(buffer, mimeType);
    } catch (error) {
      log.warn(logEmoji.warn, `[generate] download immagine fallito: ${error.message}`);
      return item;
    }
  }

  const dataMatch = item.match(/^data:([^;]+);base64,(.+)$/);
  if (dataMatch) {
    const mimeType = dataMatch[1] || 'image/png';
    const base64String = dataMatch[2];
    const buffer = Buffer.from(base64String, 'base64');
    return await saveBufferToLocal(buffer, mimeType, mimeType.split('/')[1]);
  }

  try {
    const buffer = Buffer.from(item, 'base64');
    return await saveBufferToLocal(buffer, 'image/png', 'png');
  } catch (error) {
    log.warn(logEmoji.warn, `[generate] salvataggio base64 fallito: ${error.message}`);
    return null;
  }
}

module.exports = {
  normalizeImageInput,
  parseDimensions,
  saveOutputItem,
};
