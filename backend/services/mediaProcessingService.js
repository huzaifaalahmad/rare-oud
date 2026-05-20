const sharp = require('sharp');
const path = require('path');
const fs = require('fs/promises');
const objectStorage = require('../utils/objectStorage');

function parseNumberList(value, fallback) {
  const parsed = String(value || '')
    .split(',')
    .map(item => Number(item.trim()))
    .filter(item => Number.isFinite(item) && item > 0);
  return parsed.length ? parsed : fallback;
}

function parseFormatList(value, fallback) {
  const allowed = new Set(['webp', 'avif']);
  const parsed = String(value || '')
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(item => allowed.has(item));
  return parsed.length ? parsed : fallback;
}

const sizes = parseNumberList(process.env.UPLOAD_VARIANT_WIDTHS, [640, 1280]);
const formats = parseFormatList(process.env.UPLOAD_VARIANT_FORMATS, ['webp']);

async function createImageVariants(sourcePath, basename) {
  const variants = [];
  for (const width of sizes) {
    for (const format of formats) {
      const filename = `${basename}-${width}.${format}`;
      const buffer = await sharp(sourcePath)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .toFormat(format, { quality: format === 'avif' ? 50 : 76 })
        .toBuffer();
      if (objectStorage.enabled()) {
        const stored = await objectStorage.uploadImage({ buffer, filename, contentType: `image/${format}` });
        variants.push({ width, format, url: stored.url, key: stored.key });
      } else {
        const dir = path.dirname(sourcePath);
        const out = path.join(dir, filename);
        await fs.writeFile(out, buffer);
        variants.push({ width, format, url: `/uploads/products/${filename}`, key: null });
      }
    }
  }
  return variants;
}
module.exports = { createImageVariants };
