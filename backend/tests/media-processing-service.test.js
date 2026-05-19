const fs = require('fs');
const os = require('os');
const path = require('path');

const toBuffer = jest.fn().mockResolvedValue(Buffer.from('variant'));
const toFormat = jest.fn(() => ({ toBuffer }));
const resize = jest.fn(() => ({ toFormat }));
const rotate = jest.fn(() => ({ resize }));
const mockSharp = jest.fn(() => ({ rotate }));

jest.mock('sharp', () => mockSharp);

jest.mock('../utils/objectStorage', () => ({
  enabled: jest.fn(),
  uploadImage: jest.fn()
}));

const objectStorage = require('../utils/objectStorage');
const { createImageVariants } = require('../services/mediaProcessingService');

describe('media processing service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates local WebP and AVIF variants when object storage is disabled', async () => {
    objectStorage.enabled.mockReturnValue(false);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rare-oud-media-'));
    const source = path.join(dir, 'source.jpg');
    fs.writeFileSync(source, Buffer.from('source'));

    try {
      const variants = await createImageVariants(source, 'oud');

      expect(variants).toHaveLength(8);
      expect(variants[0]).toEqual({ width: 320, format: 'webp', url: '/uploads/products/oud-320.webp', key: null });
      expect(fs.existsSync(path.join(dir, 'oud-320.webp'))).toBe(true);
      expect(fs.existsSync(path.join(dir, 'oud-1280.avif'))).toBe(true);
      expect(mockSharp).toHaveBeenCalledWith(source);
      expect(resize).toHaveBeenCalledWith({ width: 320, withoutEnlargement: true });
      expect(toFormat).toHaveBeenCalledWith('avif', { quality: 50 });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('uploads variants to object storage when configured', async () => {
    objectStorage.enabled.mockReturnValue(true);
    objectStorage.uploadImage.mockImplementation(async ({ filename }) => ({
      key: `products/${filename}`,
      url: `https://cdn.example/products/${filename}`
    }));

    const variants = await createImageVariants('source.jpg', 'oud');

    expect(variants).toHaveLength(8);
    expect(variants[7]).toEqual({
      width: 1280,
      format: 'avif',
      url: 'https://cdn.example/products/oud-1280.avif',
      key: 'products/oud-1280.avif'
    });
    expect(objectStorage.uploadImage).toHaveBeenCalledWith(expect.objectContaining({
      filename: 'oud-320.webp',
      contentType: 'image/webp'
    }));
  });
});
