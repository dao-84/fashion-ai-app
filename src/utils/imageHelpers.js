const {
  MAX_BASE64_IMAGE_BYTES,
  MAX_IMAGE_URL_LENGTH,
  isAllowedBase64Image,
  isAllowedImageUrl,
  estimateBase64Bytes,
  resolveGeneratedFilePath,
} = require('./security.utils');

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

    const normalizedPath = rawPath.trim().replace(/^\/+/, '').replace(/\//g, path.sep);

    if (normalizedPath === 'generated' || normalizedPath.startsWith(`generated${path.sep}`)) {
      const relativeGeneratedPath = normalizedPath.replace(/^generated[\\\/]?/, '');
      try {
        const generatedCandidate = resolveGeneratedFilePath(galleryDir, relativeGeneratedPath);
        if (fs.existsSync(generatedCandidate)) {
          return generatedCandidate;
        }
      } catch (_error) {
        return null;
      }
    }

    const publicBasePath = path.resolve(publicDir);
    const publicCandidate = path.resolve(publicBasePath, normalizedPath);
    if (
      publicCandidate === publicBasePath ||
      (!publicCandidate.startsWith(`${publicBasePath}${path.sep}`) && publicCandidate !== publicBasePath)
    ) {
      return null;
    }

    if (fs.existsSync(publicCandidate)) {
      return publicCandidate;
    }

    return null;
  };

  if (item.startsWith('/')) {
    return tryResolvePath(item);
  }

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

  return tryResolvePath(item);
}

function normalizeImageInput(item, deps) {
  const { fs, path } = deps;

  if (typeof item !== 'string') {
    return {
      value: null,
      sourceType: 'invalid-input',
      error: 'Invalid image input',
    };
  }

  const trimmed = item.trim();
  if (!trimmed) {
    return {
      value: null,
      sourceType: 'invalid-input',
      error: 'Invalid image input',
    };
  }

  if (trimmed.startsWith('data:')) {
    if (!isAllowedBase64Image(trimmed)) {
      return {
        value: null,
        sourceType: 'invalid-data-uri',
        error: 'Invalid image input',
      };
    }

    if (estimateBase64Bytes(trimmed) > MAX_BASE64_IMAGE_BYTES) {
      return {
        value: null,
        sourceType: 'oversized-data-uri',
        error: 'Input too large',
      };
    }

    return { value: trimmed, sourceType: 'data-uri' };
  }

  const localPath = resolveLocalImagePath(trimmed, deps);
  if (localPath) {
    const buffer = fs.readFileSync(localPath);
    if (buffer.length > MAX_BASE64_IMAGE_BYTES) {
      return {
        value: null,
        sourceType: 'oversized-local-file',
        error: 'Input too large',
      };
    }
    const ext = path.extname(localPath).replace('.', '') || 'png';
    return {
      value: `data:image/${ext};base64,${buffer.toString('base64')}`,
      sourceType: 'local-file',
      sourcePath: localPath,
    };
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.length > MAX_IMAGE_URL_LENGTH || !isAllowedImageUrl(trimmed)) {
      return {
        value: null,
        sourceType: 'invalid-remote-url',
        error: 'Invalid image input',
      };
    }

    return { value: trimmed, sourceType: 'remote-url' };
  }

  if (trimmed.startsWith('/')) {
    return {
      value: null,
      sourceType: 'invalid-local-path',
      error: 'Invalid image input',
    };
  }

  return {
    value: null,
    sourceType: 'invalid-input',
    error: 'Invalid image input',
  };
}

async function saveOutputItem(item, index, deps) {
  const { fetch, fs, path, galleryDir, log, logEmoji } = deps;

  const resolveUrl = (maybe) => {
    if (!maybe) return null;
    if (typeof maybe === 'string') return maybe;
    if (typeof maybe.url === 'function') return maybe.url();
    if (typeof maybe.url === 'string') return maybe.url;
    return null;
  };

  const saveBufferToLocal = (buffer, mimeType, fallbackExt = 'jpg') => {
    try {
      const safeMime = mimeType || 'application/octet-stream';
      const ext = (safeMime.split('/')[1] || fallbackExt || 'bin').split(';')[0];
      const fileName = `look-${Date.now()}-${index}-${Math.floor(Math.random() * 1e6)}.${ext}`;
      const filePath = path.join(galleryDir, fileName);
      fs.writeFileSync(filePath, buffer);
      log.info(logEmoji.save, `[generate] salvato file: ${filePath}`);
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
        return saveBufferToLocal(buffer, mimeType);
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
      return saveBufferToLocal(buffer, mimeType);
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
    return saveBufferToLocal(buffer, mimeType, mimeType.split('/')[1]);
  }

  try {
    const buffer = Buffer.from(item, 'base64');
    return saveBufferToLocal(buffer, 'image/png', 'png');
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
