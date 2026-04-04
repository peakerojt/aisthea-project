const uploadMock = jest.fn();
const urlMock = jest.fn((publicId: string) => `https://res.cloudinary.com/test/image/upload/${publicId}`);

jest.mock('../../config/cloudinary.config', () => ({
  __esModule: true,
  default: {
    uploader: {
      upload: (...args: unknown[]) => uploadMock(...args),
    },
    url: urlMock,
  },
}));

jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import { cloudinaryService } from '../cloudinary.service';

describe('cloudinaryService.uploadBankQrImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    uploadMock.mockResolvedValue({
      public_id: 'refund-bank-qr/user-7/sample-qr',
      url: 'http://res.cloudinary.com/test/image/upload/refund-bank-qr/user-7/sample-qr.png',
      secure_url: 'https://res.cloudinary.com/test/image/upload/refund-bank-qr/user-7/sample-qr.png',
      format: 'png',
      width: 1200,
      height: 1200,
      bytes: 123456,
      eager: [
        {
          secure_url: 'https://res.cloudinary.com/test/image/upload/eager/refund-bank-qr/user-7/sample-qr.png',
        },
      ],
    });
  });

  it('uploads bank QR images with scan-safe Cloudinary transformations', async () => {
    const result = await cloudinaryService.uploadBankQrImage('data:image/png;base64,bank-qr', 7);

    expect(uploadMock).toHaveBeenCalledTimes(1);
    const [, options] = uploadMock.mock.calls[0] as [string, Record<string, unknown>];

    expect(options.folder).toBe('refund-bank-qr/user-7');
    expect(options.allowed_formats).toEqual(['jpg', 'jpeg', 'png', 'webp']);
    expect(options.resource_type).toBe('image');
    expect(options.eager_async).toBe(false);

    const transformation = (options.transformation as Array<Record<string, unknown>>)[0];
    expect(transformation).toMatchObject({
      width: 1600,
      height: 1600,
      crop: 'limit',
      quality: 'auto:best',
      fetch_format: 'auto',
      dpr: 'auto',
    });
    expect(transformation).not.toHaveProperty('format', 'jpg');
    expect(transformation).not.toHaveProperty('crop', 'fill');

    const eagerTransformation = (options.eager as Array<Record<string, unknown>>)[0];
    expect(eagerTransformation).toMatchObject({
      width: 900,
      height: 900,
      crop: 'limit',
      quality: 'auto:best',
      fetch_format: 'auto',
      dpr: 'auto',
    });

    expect(result.secureUrl).toBe('https://res.cloudinary.com/test/image/upload/refund-bank-qr/user-7/sample-qr');
    expect(result.previewUrl).toBe('https://res.cloudinary.com/test/image/upload/eager/refund-bank-qr/user-7/sample-qr.png');
  });
});
