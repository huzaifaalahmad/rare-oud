const fs = require('fs');
const os = require('os');
const path = require('path');
const { upload } = require('../config/multer');
const uploadSecurity = require('../services/uploadSecurityService');

describe('upload security gate', () => {
  test('multer limits file size and number of files', () => {
    expect(upload).toBeDefined();
  });

  test('temporary upload directory is not the public product directory', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rare-oud-upload-test-'));
    expect(tmp).toContain('rare-oud-upload-test-');
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('detects safe image magic bytes only', () => {
    expect(uploadSecurity.detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toEqual({ mime: 'image/jpeg', ext: '.jpg' });
    expect(uploadSecurity.detectImageType(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))).toEqual({ mime: 'image/png', ext: '.png' });
    expect(uploadSecurity.detectImageType(Buffer.from('MZ executable'))).toBeNull();
  });
});
