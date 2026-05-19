const sharp = require('sharp');
const path = require('path');
const fs = require('fs/promises');
const objectStorage = require('../utils/objectStorage');

const sizes = [320, 640, 960, 1280];
const formats = ['webp', 'avif'];

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
