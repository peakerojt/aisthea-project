import jsQR from 'jsqr';

type PointLike = {
  x: number;
  y: number;
};

type Quadrilateral = [PointLike, PointLike, PointLike, PointLike];

export type BankQrNormalizationErrorCode =
  | 'BANK_QR_INVALID_IMAGE'
  | 'BANK_QR_IMAGE_LOAD_FAILED'
  | 'BANK_QR_CANVAS_UNAVAILABLE'
  | 'BANK_QR_NOT_DETECTED'
  | 'BANK_QR_OUTPUT_FAILED';

export class BankQrNormalizationError extends Error {
  code: BankQrNormalizationErrorCode;

  constructor(code: BankQrNormalizationErrorCode, message: string) {
    super(message);
    this.name = 'BankQrNormalizationError';
    this.code = code;
  }
}

export const BANK_QR_OUTPUT_SIZE = 1024;
export const BANK_QR_PADDING_RATIO = 0.08;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getCanvasContext = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new BankQrNormalizationError(
      'BANK_QR_CANVAS_UNAVAILABLE',
      'Không thể xử lý ảnh QR trên trình duyệt hiện tại.',
    );
  }

  return context;
};

const loadImageElement = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new BankQrNormalizationError(
          'BANK_QR_IMAGE_LOAD_FAILED',
          'Không thể đọc ảnh QR. Vui lòng chọn lại ảnh rõ hơn.',
        ),
      );
    };

    image.src = objectUrl;
  });

const inferNormalizedFileName = (fileName: string) => {
  const lastDotIndex = fileName.lastIndexOf('.');
  const baseName = lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
  return `${baseName}-normalized.png`;
};

export const expandQuadrilateral = (
  points: Quadrilateral,
  paddingRatio: number,
  maxWidth: number,
  maxHeight: number,
): Quadrilateral => {
  const centerX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const centerY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const scale = 1 + paddingRatio;

  return points.map((point) => ({
    x: clamp(centerX + ((point.x - centerX) * scale), 0, maxWidth - 1),
    y: clamp(centerY + ((point.y - centerY) * scale), 0, maxHeight - 1),
  })) as Quadrilateral;
};

type HomographyCoefficients = [number, number, number, number, number, number, number, number];

const solveLinearSystem = (matrix: number[][], vector: number[]) => {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let pivotIndex = 0; pivotIndex < size; pivotIndex += 1) {
    let bestRowIndex = pivotIndex;
    for (let candidateIndex = pivotIndex + 1; candidateIndex < size; candidateIndex += 1) {
      if (Math.abs(augmented[candidateIndex][pivotIndex]) > Math.abs(augmented[bestRowIndex][pivotIndex])) {
        bestRowIndex = candidateIndex;
      }
    }

    if (Math.abs(augmented[bestRowIndex][pivotIndex]) < 1e-10) {
      throw new BankQrNormalizationError(
        'BANK_QR_OUTPUT_FAILED',
        'Không thể hiệu chỉnh phối cảnh cho ảnh QR.',
      );
    }

    if (bestRowIndex !== pivotIndex) {
      [augmented[pivotIndex], augmented[bestRowIndex]] = [augmented[bestRowIndex], augmented[pivotIndex]];
    }

    const pivot = augmented[pivotIndex][pivotIndex];
    for (let columnIndex = pivotIndex; columnIndex <= size; columnIndex += 1) {
      augmented[pivotIndex][columnIndex] /= pivot;
    }

    for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
      if (rowIndex === pivotIndex) {
        continue;
      }

      const factor = augmented[rowIndex][pivotIndex];
      if (factor === 0) {
        continue;
      }

      for (let columnIndex = pivotIndex; columnIndex <= size; columnIndex += 1) {
        augmented[rowIndex][columnIndex] -= factor * augmented[pivotIndex][columnIndex];
      }
    }
  }

  return augmented.map((row) => row[size]);
};

const createHomography = (sourcePoints: Quadrilateral, destinationPoints: Quadrilateral): HomographyCoefficients => {
  const matrix: number[][] = [];
  const vector: number[] = [];

  for (let index = 0; index < sourcePoints.length; index += 1) {
    const sourcePoint = sourcePoints[index];
    const destinationPoint = destinationPoints[index];
    const x = sourcePoint.x;
    const y = sourcePoint.y;
    const u = destinationPoint.x;
    const v = destinationPoint.y;

    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    vector.push(u);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    vector.push(v);
  }

  return solveLinearSystem(matrix, vector) as HomographyCoefficients;
};

const transformPoint = (coefficients: HomographyCoefficients, x: number, y: number): PointLike => {
  const [a, b, c, d, e, f, g, h] = coefficients;
  const denominator = (g * x) + (h * y) + 1;

  if (Math.abs(denominator) < 1e-10) {
    return { x: Number.NaN, y: Number.NaN };
  }

  return {
    x: ((a * x) + (b * y) + c) / denominator,
    y: ((d * x) + (e * y) + f) / denominator,
  };
};

const createBlankImageData = (context: CanvasRenderingContext2D, size: number) => {
  const imageData = context.createImageData(size, size);
  imageData.data.fill(255);
  return imageData;
};

export const renderWarpedQrCanvas = (
  sourceImageData: ImageData,
  corners: Quadrilateral,
  outputSize: number = BANK_QR_OUTPUT_SIZE,
  paddingRatio: number = BANK_QR_PADDING_RATIO,
) => {
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = outputSize;
  outputCanvas.height = outputSize;
  const outputContext = getCanvasContext(outputCanvas);
  const outputImageData = createBlankImageData(outputContext, outputSize);
  const sourceWidth = sourceImageData.width;
  const sourceHeight = sourceImageData.height;
  const expandedCorners = expandQuadrilateral(corners, paddingRatio, sourceWidth, sourceHeight);
  const outputCorners: Quadrilateral = [
    { x: 0, y: 0 },
    { x: outputSize - 1, y: 0 },
    { x: outputSize - 1, y: outputSize - 1 },
    { x: 0, y: outputSize - 1 },
  ];
  const inverseHomography = createHomography(
    outputCorners,
    expandedCorners,
  );
  const sourcePixels = sourceImageData.data;
  const outputPixels = outputImageData.data;

  for (let y = 0; y < outputSize; y += 1) {
    for (let x = 0; x < outputSize; x += 1) {
      const { x: sourceX, y: sourceY } = transformPoint(inverseHomography, x, y);
      if (!Number.isFinite(sourceX) || !Number.isFinite(sourceY)) {
        continue;
      }

      const sampledX = Math.round(sourceX);
      const sampledY = Math.round(sourceY);

      if (sampledX < 0 || sampledX >= sourceWidth || sampledY < 0 || sampledY >= sourceHeight) {
        continue;
      }

      const sourceOffset = ((sampledY * sourceWidth) + sampledX) * 4;
      const targetOffset = ((y * outputSize) + x) * 4;
      outputPixels[targetOffset] = sourcePixels[sourceOffset];
      outputPixels[targetOffset + 1] = sourcePixels[sourceOffset + 1];
      outputPixels[targetOffset + 2] = sourcePixels[sourceOffset + 2];
      outputPixels[targetOffset + 3] = sourcePixels[sourceOffset + 3];
    }
  }

  outputContext.putImageData(outputImageData, 0, 0);
  return outputCanvas;
};

const canvasToPngBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(
          new BankQrNormalizationError(
            'BANK_QR_OUTPUT_FAILED',
            'Không thể xuất ảnh QR đã chuẩn hóa.',
          ),
        );
        return;
      }

      resolve(blob);
    }, 'image/png');
  });

export async function normalizeBankQrImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new BankQrNormalizationError(
      'BANK_QR_INVALID_IMAGE',
      'Chỉ có thể tải lên tệp hình ảnh cho mã QR.',
    );
  }

  const image = await loadImageElement(file);
  const sourceCanvas = document.createElement('canvas');
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (!sourceWidth || !sourceHeight) {
    throw new BankQrNormalizationError(
      'BANK_QR_IMAGE_LOAD_FAILED',
      'Không thể đọc kích thước ảnh QR. Vui lòng chọn ảnh khác.',
    );
  }

  sourceCanvas.width = sourceWidth;
  sourceCanvas.height = sourceHeight;
  const sourceContext = getCanvasContext(sourceCanvas);
  sourceContext.drawImage(image, 0, 0, sourceWidth, sourceHeight);
  const sourceImageData = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight);
  const qrResult = jsQR(sourceImageData.data, sourceWidth, sourceHeight, {
    inversionAttempts: 'attemptBoth',
  });

  if (!qrResult) {
    throw new BankQrNormalizationError(
      'BANK_QR_NOT_DETECTED',
      'Không nhận diện được mã QR trong ảnh.',
    );
  }

  const normalizedCanvas = renderWarpedQrCanvas(sourceImageData, [
    qrResult.location.topLeftCorner,
    qrResult.location.topRightCorner,
    qrResult.location.bottomRightCorner,
    qrResult.location.bottomLeftCorner,
  ]);
  const normalizedBlob = await canvasToPngBlob(normalizedCanvas);

  return new File([normalizedBlob], inferNormalizedFileName(file.name), {
    type: 'image/png',
    lastModified: Date.now(),
  });
}
