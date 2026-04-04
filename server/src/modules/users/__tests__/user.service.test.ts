import { QRPay } from 'vietnam-qr-pay';
import { createBankQrValidationToken } from '../bank-qr-validation';

const uploadBankQrImageMock = jest.fn();
const prismaTransactionMock = jest.fn();
const countBankAccountsMock = jest.fn();
const updateManyBankAccountsMock = jest.fn();
const createBankAccountRecordMock = jest.fn();
const updateReturnRequestsMock = jest.fn();
const findFirstBankAccountMock = jest.fn();

const txMock = {
  customerBankAccount: {
    count: (...args: unknown[]) => countBankAccountsMock(...args),
    updateMany: (...args: unknown[]) => updateManyBankAccountsMock(...args),
    create: (...args: unknown[]) => createBankAccountRecordMock(...args),
  },
  returnRequest: {
    updateMany: (...args: unknown[]) => updateReturnRequestsMock(...args),
  },
};

jest.mock('../../../lib/prisma', () => ({
  prisma: {
    $transaction: (...args: unknown[]) => prismaTransactionMock(...args),
    customerBankAccount: {
      findFirst: (...args: unknown[]) => findFirstBankAccountMock(...args),
    },
  },
}));

jest.mock('../../../middlewares/auth.middleware', () => ({
  clearPermissionCache: jest.fn(),
}));

jest.mock('../../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../../../services/cloudinary.service', () => ({
  cloudinaryService: {
    uploadBankQrImage: (...args: unknown[]) => uploadBankQrImageMock(...args),
  },
}));

import { userModuleService } from '../user.service';

const buildCreatedBankAccountRecord = () => ({
  bankAccountId: 11,
  bankName: 'Vietcombank',
  bankCode: 'VCB',
  accountNumber: '123456789',
  accountHolder: 'NGUYEN VAN A',
  qrImageUrl: 'https://res.cloudinary.com/test/image/upload/refund-bank-qr/user-7/sample-qr',
  inputMethod: 'QR_IMAGE',
  isDefault: true,
  isActive: true,
  updatedAt: new Date('2026-04-03T08:00:00.000Z'),
  createdAt: new Date('2026-04-03T08:00:00.000Z'),
});

describe('userModuleService banking QR validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaTransactionMock.mockImplementation(async (callback: (tx: typeof txMock) => unknown) => callback(txMock));
    countBankAccountsMock.mockResolvedValue(0);
    updateManyBankAccountsMock.mockResolvedValue({ count: 0 });
    updateReturnRequestsMock.mockResolvedValue({ count: 0 });
    createBankAccountRecordMock.mockResolvedValue(buildCreatedBankAccountRecord());
    findFirstBankAccountMock.mockResolvedValue(null);
    uploadBankQrImageMock.mockResolvedValue({
      secureUrl: 'https://res.cloudinary.com/test/image/upload/refund-bank-qr/user-7/sample-qr',
    });
  });

  it('uploads a supported QR image and returns analysis plus validation token', async () => {
    const qrContent = QRPay.initVietQR({
      bankBin: '970436',
      bankNumber: '123456789',
      purpose: 'Refund',
    }).build();

    const result = await userModuleService.uploadBankQrImage(7, {
      imageData: 'data:image/png;base64,bank-qr',
      fileName: 'bank-qr.png',
      qrContent,
    });

    expect(uploadBankQrImageMock).toHaveBeenCalledWith('data:image/png;base64,bank-qr', 7);
    expect(result.fileUrl).toBe('https://res.cloudinary.com/test/image/upload/refund-bank-qr/user-7/sample-qr');
    expect(result.fileName).toBe('bank-qr.png');
    expect(result.qrAnalysis).toMatchObject({
      destinationType: 'BANK',
      bankCode: 'VCB',
      accountNumber: '123456789',
    });
    expect(typeof result.qrValidationToken).toBe('string');
  });

  it('rejects unsupported QR mime types before calling Cloudinary', async () => {
    await expect(
      userModuleService.uploadBankQrImage(7, {
        imageData: 'data:image/gif;base64,bank-qr',
        fileName: 'bank-qr.gif',
        qrContent: 'MOMOW2W',
      }),
    ).rejects.toMatchObject({
      status: 400,
      code: 'UNSUPPORTED_BANK_QR_TYPE',
    });

    expect(uploadBankQrImageMock).not.toHaveBeenCalled();
  });

  it('rejects creating a bank account when the QR token belongs to a wallet', async () => {
    const qrValidationToken = createBankQrValidationToken(
      7,
      'https://res.cloudinary.com/test/image/upload/refund-bank-qr/user-7/sample-qr',
      {
        rawContent: 'MOMOW2W',
        destinationType: 'WALLET',
        providerName: 'MoMo',
        walletProvider: 'MoMo',
        bankBin: null,
        bankCode: null,
        accountNumber: null,
        accountHolder: null,
      },
    );

    await expect(
      userModuleService.createBankAccount(7, {
        bankName: 'Vietcombank',
        bankCode: 'VCB',
        accountNumber: '123456789',
        accountHolder: 'NGUYEN VAN A',
        qrImageUrl: 'https://res.cloudinary.com/test/image/upload/refund-bank-qr/user-7/sample-qr',
        qrValidationToken,
        inputMethod: 'QR_IMAGE',
      }),
    ).rejects.toMatchObject({
      status: 400,
      code: 'BANK_QR_TYPE_MISMATCH',
    });

    expect(prismaTransactionMock).not.toHaveBeenCalled();
  });

  it('rejects creating a bank account when the QR bank code does not match the form', async () => {
    const qrValidationToken = createBankQrValidationToken(
      7,
      'https://res.cloudinary.com/test/image/upload/refund-bank-qr/user-7/sample-qr',
      {
        rawContent: 'TCB',
        destinationType: 'BANK',
        providerName: 'Techcombank',
        walletProvider: null,
        bankBin: '970407',
        bankCode: 'TCB',
        accountNumber: '123456789',
        accountHolder: 'NGUYEN VAN A',
      },
    );

    await expect(
      userModuleService.createBankAccount(7, {
        bankName: 'Vietcombank',
        bankCode: 'VCB',
        accountNumber: '123456789',
        accountHolder: 'NGUYEN VAN A',
        qrImageUrl: 'https://res.cloudinary.com/test/image/upload/refund-bank-qr/user-7/sample-qr',
        qrValidationToken,
        inputMethod: 'QR_IMAGE',
      }),
    ).rejects.toMatchObject({
      status: 400,
      code: 'BANK_QR_BANK_CODE_MISMATCH',
    });

    expect(prismaTransactionMock).not.toHaveBeenCalled();
  });

  it('creates a bank account when the QR token matches the submitted bank info', async () => {
    const qrValidationToken = createBankQrValidationToken(
      7,
      'https://res.cloudinary.com/test/image/upload/refund-bank-qr/user-7/sample-qr',
      {
        rawContent: 'VCB',
        destinationType: 'BANK',
        providerName: 'Vietcombank',
        walletProvider: null,
        bankBin: '970436',
        bankCode: 'VCB',
        accountNumber: '123456789',
        accountHolder: 'NGUYEN VAN A',
      },
    );

    const result = await userModuleService.createBankAccount(7, {
      bankName: 'Vietcombank',
      bankCode: 'VCB',
      accountNumber: '123456789',
      accountHolder: 'NGUYEN VAN A',
      qrImageUrl: 'https://res.cloudinary.com/test/image/upload/refund-bank-qr/user-7/sample-qr',
      qrValidationToken,
      inputMethod: 'QR_IMAGE',
    });

    expect(prismaTransactionMock).toHaveBeenCalled();
    expect(createBankAccountRecordMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bankName: 'Vietcombank',
        bankCode: 'VCB',
        accountNumber: '123456789',
        accountHolder: 'NGUYEN VAN A',
        qrImageUrl: 'https://res.cloudinary.com/test/image/upload/refund-bank-qr/user-7/sample-qr',
      }),
    });
    expect(result).toMatchObject({
      bankName: 'Vietcombank',
      bankCode: 'VCB',
      qrImageUrl: 'https://res.cloudinary.com/test/image/upload/refund-bank-qr/user-7/sample-qr',
    });
  });
});
