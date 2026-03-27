const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { env } = require('../../config/env');

let _client = null;

function isConfigured() {
  return !!(
    env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.R2_BUCKET_NAME &&
    env.R2_PUBLIC_URL
  );
}

function getClient() {
  if (!_client) {
    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
}

/**
 * Carica un buffer su R2 e restituisce l'URL pubblico.
 * @param {Buffer} buffer - contenuto del file
 * @param {string} fileName - nome del file (es. look-12345.jpg)
 * @param {string} mimeType - tipo MIME (es. image/jpeg)
 * @returns {Promise<string>} URL pubblico
 */
async function upload(buffer, fileName, mimeType) {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: mimeType,
    })
  );
  const base = env.R2_PUBLIC_URL.replace(/\/$/, '');
  return `${base}/${fileName}`;
}

/**
 * Elimina un file da R2.
 * @param {string} fileName - nome del file da eliminare
 */
async function remove(fileName) {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: fileName,
    })
  );
}

module.exports = { isConfigured, upload, remove };
