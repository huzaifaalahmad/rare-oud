const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const crypto = require('crypto');
const AppError = require('../utils/AppError');
const uploadSecurity = require('../services/uploadSecurityService');
const objectStorage = require('../utils/objectStorage');
const mediaProcessing = require('../services/mediaProcessingService');
const logger = require('../utils/logger');
const sharp = require('sharp');

const uploadRoot = path.join(__dirname, '..', 'uploads');
const tmpDir = path.join(uploadRoot, 'tmp');
const productDir = path.join(uploadRoot, 'products');
fs.mkdirSync(tmpDir, { recursive: true });
fs.mkdirSync(productDir, { recursive: true });

const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp']);
const defaultMaxFileSize = 12 * 1024 * 1024;
const configuredMaxFileSize = Number(process.env.UPLOAD_MAX_FILE_SIZE_BYTES || 0);
const maxFileSize = Math.max(configuredMaxFileSize, defaultMaxFileSize);
const maxFiles = Number(process.env.UPLOAD_MAX_FILES || 4);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tmpDir),
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname || '').toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 8);
    cb(null, `${Date.now()}-${crypto.randomBytes(10).toString('hex')}${safeExt || '.upload'}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: maxFileSize, files: maxFiles },
  fileFilter(_req, file, cb) {
    // Metadata is only a first gate. persistValidatedImages() verifies magic bytes from disk.
    if (!allowedMime.has(file.mimetype)) {
      return cb(new AppError('Only safe image files are allowed: jpg, png, webp', 400, 'INVALID_FILE_TYPE'));
    }
    cb(null, true);
  }
});

async function cleanupTmp(files) {
  await Promise.all((files || []).map(file => file.path ? fsp.unlink(file.path).catch(() => {}) : Promise.resolve()));
}

async function persistOne(file) {
  await uploadSecurity.validateImageFile({ req: file.reqContext, file, allowedMime });
  const basename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  const filename = `${basename}.webp`;
  const finalPath = path.join(productDir, filename);
  let storageResult = null;
  const sanitizedPath = path.join(tmpDir, `${basename}.webp`);
  try {
    await sharp(file.path, {
      limitInputPixels: Number(process.env.UPLOAD_MAX_PIXELS || 24000000),
      animated: false,
      failOn: 'none'
    })
      .rotate()
      .toColorspace('srgb')
      .webp({ quality: Number(process.env.UPLOAD_WEBP_QUALITY || 82), effort: 4 })
      .toFile(sanitizedPath);
  } catch (error) {
    await fsp.unlink(sanitizedPath).catch(() => {});
    logger.warn('Image processing failed', { error: error.message, mimetype: file.mimetype, size: file.size });
    throw new AppError('Image could not be processed. Re-export it as JPG, PNG, or WebP and try again.', 400, 'IMAGE_PROCESSING_FAILED');
  }
  let sourceForVariants = sanitizedPath;
  if (objectStorage.enabled()) {
    storageResult = await objectStorage.uploadImage({ stream: fs.createReadStream(sanitizedPath), filename, contentType: 'image/webp' });
  } else {
    await fsp.rename(sanitizedPath, finalPath);
    sourceForVariants = finalPath;
  }
  await fsp.unlink(file.path).catch(() => {});
  const variants = await mediaProcessing.createImageVariants(sourceForVariants, basename).catch(error => { logger.warn('Image variant generation failed', { error: error.message }); return []; });
  if (objectStorage.enabled()) await fsp.unlink(sanitizedPath).catch(() => {});
  return {
    ...file,
    filename,
    path: finalPath,
    destination: productDir,
    storage_key: storageResult?.key || null,
    public_url: storageResult?.url || null,
    variants,
    buffer: undefined
  };
}

async function persistValidatedImages(req, _res, next) {
  const files = req.files || [];
  try {
    for (const file of files) file.reqContext = req;
    req.files = await Promise.all(files.map(persistOne));
    next();
  } catch (err) {
    logger.warn('Upload rejected', { code: err.code, message: err.message });
    await cleanupTmp(files);
    next(err);
  }
}

module.exports = { upload, persistValidatedImages };
