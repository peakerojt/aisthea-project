import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const jsQrMock = vi.fn();
const drawImageMock = vi.fn();
const getImageDataMock = vi.fn();
const createImageDataMock = vi.fn();
const putImageDataMock = vi.fn();

vi.mock('jsqr', () => ({
  default: (...args: unknown[]) => jsQrMock(...args),
}));

import { normalizeBankQrImage } from '@/common/utils/bankQrNormalization';

const sourceWidth = 400;
const sourceHeight = 300;

class MockImage {
  width = sourceWidth;
  height = sourceHeight;
  naturalWidth = sourceWidth;
  naturalHeight = sourceHeight;
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;

  set src(_value: string) {
    queueMicrotask(() => {
      this.onload?.();
    });
  }
}

describe('bankQrNormalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const sourcePixels = new Uint8ClampedArray(sourceWidth * sourceHeight * 4).fill(180);
    getImageDataMock.mockReturnValue({
      data: sourcePixels,
      width: sourceWidth,
      height: sourceHeight,
    });
    createImageDataMock.mockImplementation((width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    }));

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => 'blob:qr-image'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => undefined),
    });
    vi.stubGlobal('Image', MockImage);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
      drawImage: drawImageMock,
      getImageData: getImageDataMock,
      createImageData: createImageDataMock,
      putImageData: putImageDataMock,
    }) as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback, type) => {
      callback?.(new Blob(['normalized'], { type: type ?? 'image/png' }));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns a normalized square PNG when QR corners are detected', async () => {
    jsQrMock.mockReturnValue({
      location: {
        topLeftCorner: { x: 40, y: 35 },
        topRightCorner: { x: 320, y: 32 },
        bottomRightCorner: { x: 330, y: 286 },
        bottomLeftCorner: { x: 36, y: 292 },
      },
    });

    const file = new File(['raw-qr'], 'bank-qr.jpg', { type: 'image/jpeg' });
    const normalizedFile = await normalizeBankQrImage(file);

    expect(normalizedFile).toBeInstanceOf(File);
    expect(normalizedFile.type).toBe('image/png');
    expect(normalizedFile.name).toBe('bank-qr-normalized.png');
    expect(jsQrMock).toHaveBeenCalledWith(expect.any(Uint8ClampedArray), sourceWidth, sourceHeight, {
      inversionAttempts: 'attemptBoth',
    });
    expect(putImageDataMock).toHaveBeenCalledTimes(1);
  });

  it('throws a domain error when no QR code is detected', async () => {
    jsQrMock.mockReturnValue(null);

    const file = new File(['raw-qr'], 'bank-qr.png', { type: 'image/png' });

    await expect(normalizeBankQrImage(file)).rejects.toMatchObject({
      name: 'BankQrNormalizationError',
      code: 'BANK_QR_NOT_DETECTED',
    });
  });

  it('still warps a skewed QR quadrilateral into a square output', async () => {
    jsQrMock.mockReturnValue({
      location: {
        topLeftCorner: { x: 72, y: 44 },
        topRightCorner: { x: 306, y: 20 },
        bottomRightCorner: { x: 346, y: 272 },
        bottomLeftCorner: { x: 54, y: 294 },
      },
    });

    const file = new File(['raw-qr'], 'skewed-bank-qr.webp', { type: 'image/webp' });
    const normalizedFile = await normalizeBankQrImage(file);

    expect(normalizedFile).toBeInstanceOf(File);
    expect(putImageDataMock).toHaveBeenCalledTimes(1);
    expect(drawImageMock).toHaveBeenCalledTimes(1);
  });
});
