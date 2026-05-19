const path = require('path');
const AppError = require('./AppError');

function enabled() {
  return Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY);
}

function getClient() {
  try {
    const { S3Client } = require('@aws-sdk/client-s3');
    return new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(process.env.S3_ENDPOINT),
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY }
    });
  } catch {
    throw new AppError('S3/R2 dependencies are not installed. Run npm install after updating dependencies.', 500, 'OBJECT_STORAGE_NOT_INSTALLED');
  }
}

function publicUrl(key) {
  const base = process.env.CDN_BASE_URL || '';
  if (base) return `${base.replace(/\/$/, '')}/${key}`;
  if (process.env.S3_ENDPOINT) return `${process.env.S3_ENDPOINT.replace(/\/$/, '')}/${process.env.S3_BUCKET}/${key}`;
  return `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

async function uploadImage({ buffer, stream, filename, contentType }) {
  if (!enabled()) return null;
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const key = path.posix.join('products', filename);
  await getClient().send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: stream || buffer, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }));
  return { key, url: publicUrl(key) };
}

async function deleteByUrl(url) {
  if (!enabled() || !url) return false;
  const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
  const cdn = (process.env.CDN_BASE_URL || '').replace(/\/$/, '');
  let key = null;
  if (cdn && url.startsWith(`${cdn}/`)) key = url.slice(cdn.length + 1);
  if (!key && url.includes('/products/')) key = url.slice(url.indexOf('products/'));
  if (!key) return false;
  await getClient().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
  return true;
}

module.exports = { enabled, uploadImage, deleteByUrl };
