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

async function applyWatermark(buffer) {
  const sharp = require('sharp');
  const path = require('path');
  const meta = await sharp(buffer).metadata();
  const w = meta.width || 1024;
  const h = meta.height || 1024;

  const logoPath = path.join(__dirname, '../../images/logo-shotless.png');
  const logoW = Math.round(w * 0.60);

  // Ridimensiona logo e assicura canale alpha
  const logoResized = await sharp(logoPath)
    .resize(logoW, null, { fit: 'inside' })
    .ensureAlpha()
    .png()
    .toBuffer();

  const logoMeta = await sharp(logoResized).metadata();
  const lw = logoMeta.width;
  const lh = logoMeta.height;

  // Applica opacità al 40% moltiplicando il canale alpha
  const logoWithAlpha = await sharp(logoResized)
    .composite([{
      input: {
        create: { width: lw, height: lh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.40 } }
      },
      blend: 'dest-in',
    }])
    .png()
    .toBuffer();

  const left = Math.round((w - lw) / 2);
  const top = Math.round((h - lh) / 2);

  return sharp(buffer)
    .composite([{ input: logoWithAlpha, left, top, blend: 'over' }])
    .jpeg({ quality: 90 })
    .toBuffer();
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

  const isFree = deps.plan === 'free';

  const saveBufferToLocal = async (buffer, mimeType, fallbackExt = 'jpg') => {
    try {
      const safeMime = mimeType || 'application/octet-stream';
      const ext = (safeMime.split('/')[1] || fallbackExt || 'bin').split(';')[0];
      const baseName = `look-${Date.now()}-${index}-${Math.floor(Math.random() * 1e6)}`;
      const fileName = `${baseName}.${ext}`;
      const filePath = path.join(galleryDir, fileName);

      let watermarkedBuffer = buffer;
      let cleanUrl = null;

      if (isFree) {
        // Salva prima la versione pulita su R2
        if (r2.isConfigured()) {
          try {
            const cleanFileName = `${baseName}-clean.${ext}`;
            cleanUrl = await r2.upload(buffer, cleanFileName, safeMime);
            log.info(logEmoji.save, `[generate] versione pulita salvata su R2: ${cleanUrl}`);
          } catch (err) {
            log.warn(logEmoji.warn, `[generate] upload versione pulita R2 fallito: ${err.message}`);
          }
        }
        // Applica watermark al buffer principale
        try {
          watermarkedBuffer = await applyWatermark(buffer);
        } catch (wmErr) {
          log.warn(logEmoji.warn, `[generate] watermark fallito, uso immagine originale: ${wmErr.message}`);
          watermarkedBuffer = buffer;
        }
      }

      fs.writeFileSync(filePath, watermarkedBuffer);
      log.info(logEmoji.save, `[generate] salvato file: ${filePath}`);

      let publicUrl = `/generated/${fileName}`;
      if (r2.isConfigured()) {
        try {
          publicUrl = await r2.upload(watermarkedBuffer, fileName, safeMime);
          log.info(logEmoji.save, `[generate] caricato su R2: ${publicUrl}`);
        } catch (uploadError) {
          log.warn(logEmoji.warn, `[generate] upload R2 fallito, uso file locale: ${uploadError.message}`);
        }
      }

      return { url: publicUrl, cleanUrl };
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
  applyWatermark,
};
