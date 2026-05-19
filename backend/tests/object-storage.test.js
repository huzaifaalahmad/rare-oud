describe('object storage utility', () => {
  const originalEnv = process.env;
  const send = jest.fn().mockResolvedValue({});

  beforeEach(() => {
    jest.resetModules();
    send.mockClear();
    jest.doMock('@aws-sdk/client-s3', () => ({
      S3Client: jest.fn(() => ({ send })),
      PutObjectCommand: jest.fn((input) => ({ kind: 'put', input })),
      DeleteObjectCommand: jest.fn((input) => ({ kind: 'delete', input }))
    }));
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.dontMock('@aws-sdk/client-s3');
    jest.resetModules();
  });

  test('stays disabled until bucket and credentials are present', async () => {
    process.env = { ...originalEnv, S3_BUCKET: '', S3_ACCESS_KEY: '', S3_SECRET_KEY: '' };
    const storage = require('../utils/objectStorage');

    expect(storage.enabled()).toBe(false);
    await expect(storage.uploadImage({ buffer: Buffer.from('x'), filename: 'oud.jpg', contentType: 'image/jpeg' }))
      .resolves.toBeNull();
    await expect(storage.deleteByUrl('https://cdn.example/products/oud.jpg'))
      .resolves.toBe(false);
  });

  test('uploads images and builds CDN URLs', async () => {
    process.env = {
      ...originalEnv,
      S3_BUCKET: 'rare-oud',
      S3_ACCESS_KEY: 'key',
      S3_SECRET_KEY: 'secret',
      S3_REGION: 'us-east-1',
      CDN_BASE_URL: 'https://cdn.rare-oud.example/'
    };
    const storage = require('../utils/objectStorage');

    await expect(storage.uploadImage({
      buffer: Buffer.from('x'),
      filename: 'oud.jpg',
      contentType: 'image/jpeg'
    })).resolves.toEqual({
      key: 'products/oud.jpg',
      url: 'https://cdn.rare-oud.example/products/oud.jpg'
    });

    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'put',
      input: expect.objectContaining({
        Bucket: 'rare-oud',
        Key: 'products/oud.jpg',
        CacheControl: 'public, max-age=31536000, immutable'
      })
    }));
  });

  test('deletes objects by CDN or product URL', async () => {
    process.env = {
      ...originalEnv,
      S3_BUCKET: 'rare-oud',
      S3_ACCESS_KEY: 'key',
      S3_SECRET_KEY: 'secret',
      CDN_BASE_URL: 'https://cdn.rare-oud.example'
    };
    const storage = require('../utils/objectStorage');

    await expect(storage.deleteByUrl('https://cdn.rare-oud.example/products/oud.jpg'))
      .resolves.toBe(true);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'delete',
      input: expect.objectContaining({
        Bucket: 'rare-oud',
        Key: 'products/oud.jpg'
      })
    }));
  });
});
