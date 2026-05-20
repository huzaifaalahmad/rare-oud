const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('sharp', () => jest.fn(() => ({
  metadata: jest.fn().mockResolvedValue({ width: 120, height: 80 })
})));

jest.mock('../config/database', () => ({
  query: jest.fn().mockResolvedValue([])
}));

jest.mock('../utils/metrics', () => ({
  inc: jest.fn()
}));

jest.mock('../utils/logger', () => ({
  warn: jest.fn()
}));

const db = require('../config/database');
const metrics = require('../utils/metrics');
const uploadSecurity = require('../services/uploadSecurityService');

function writeTempFile(bytes, ext = '.jpg') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rare-oud-upload-sec-'));
  const filePath = path.join(dir, `upload${ext}`);
  fs.writeFileSync(filePath, bytes);
  return { dir, filePath };
}

describe('deep upload validation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('accepts matching image extension, MIME, magic bytes, and sanitized metadata', async () => {
    const { dir, filePath } = writeTempFile(Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x11]));
    try {
      await expect(uploadSecurity.validateImageFile({
        req: { id: 'req-1', ip: '127.0.0.1', headers: {}, user: { id: 1 } },
        file: {
          path: filePath,
          originalname: 'oud.jpg',
          filename: 'oud.jpg',
          mimetype: 'image/jpeg',
          size: 5
        },
        allowedMime: new Set(['image/jpeg'])
      })).resolves.toMatchObject({
        type: { mime: 'image/jpeg', ext: '.jpg' },
        metadata: { width: 120, height: 80 }
      });
      expect(metrics.inc).toHaveBeenCalledWith('upload_accepted_total');
      expect(db.query).toHaveBeenCalled();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('rejects archive polyglots before image processing completes', async () => {
    const payload = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0x00]),
      Buffer.from([0x50, 0x4b, 0x03, 0x04])
    ]);
    const { dir, filePath } = writeTempFile(payload);
    try {
      await expect(uploadSecurity.validateImageFile({
        req: { id: 'req-2', ip: '127.0.0.1', headers: {} },
        file: {
          path: filePath,
          originalname: 'polyglot.jpg',
          filename: 'polyglot.jpg',
          mimetype: 'image/jpeg',
          size: payload.length
        },
        allowedMime: new Set(['image/jpeg'])
      })).rejects.toMatchObject({ code: 'ARCHIVE_POLYGLOT_REJECTED' });
      expect(metrics.inc).toHaveBeenCalledWith('upload_rejected_total');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('does not reject valid image bytes with script-like compressed data', async () => {
    const payload = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0x00]),
      Buffer.from('<script>camera-metadata-like-bytes</script>')
    ]);
    const { dir, filePath } = writeTempFile(payload);
    try {
      await expect(uploadSecurity.validateImageFile({
        req: { id: 'req-script-like', ip: '127.0.0.1', headers: {} },
        file: {
          path: filePath,
          originalname: 'safe-camera-photo.jpg',
          filename: 'safe-camera-photo.jpg',
          mimetype: 'image/jpeg',
          size: payload.length
        },
        allowedMime: new Set(['image/jpeg'])
      })).resolves.toMatchObject({
        type: { mime: 'image/jpeg', ext: '.jpg' }
      });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('rejects mismatched extension and MIME signature', async () => {
    const { dir, filePath } = writeTempFile(Buffer.from([0xff, 0xd8, 0xff, 0x00]), '.gif');
    try {
      await expect(uploadSecurity.validateImageFile({
        req: { id: 'req-3', ip: '127.0.0.1', headers: {} },
        file: {
          path: filePath,
          originalname: 'oud.gif',
          filename: 'oud.gif',
          mimetype: 'image/jpeg',
          size: 4
        },
        allowedMime: new Set(['image/jpeg'])
      })).rejects.toMatchObject({ code: 'INVALID_FILE_EXTENSION' });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('malware scanner is explicitly skipped unless enabled', async () => {
    const previous = process.env.ENABLE_UPLOAD_AV_SCAN;
    process.env.ENABLE_UPLOAD_AV_SCAN = 'false';
    await expect(uploadSecurity.scanWithClamAv('unused')).resolves.toEqual({
      scanner: 'disabled',
      clean: true
    });
    process.env.ENABLE_UPLOAD_AV_SCAN = previous;
  });
});
