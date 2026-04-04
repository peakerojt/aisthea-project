import jsQR from 'jsqr';
import { Banks, QRPay } from 'vietnam-qr-pay';

export type QrDestinationType = 'BANK' | 'WALLET' | 'UNKNOWN';
export type BankQrMismatchIssue =
  | 'HARD_TYPE_MISMATCH'
  | 'SOFT_BANK_MISMATCH'
  | 'ACCOUNT_MISMATCH'
  | 'NAME_MISMATCH';

export type BankQrComparison = {
  issues: BankQrMismatchIssue[];
  highestSeverity: 'BLOCKING' | 'REVIEW' | 'NONE';
};

export type BankQrAnalysis = {
  rawContent: string;
  destinationType: QrDestinationType;
  providerName: string | null;
  walletProvider: string | null;
  bankBin: string | null;
  bankCode: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
};

type ComparableBankForm = {
  bankCode?: string | null;
  accountNumber: string;
  accountHolder: string;
};

const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ');

const normalizeForLookup = (value: string) =>
  normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase();

export const normalizeBankCode = (value?: string | null) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = normalizeWhitespace(value).toUpperCase();
  return normalized.length > 0 ? normalized : null;
};

export const normalizeAccountNumber = (value?: string | null) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/[\s-]+/g, '').toUpperCase();
  return normalized.length > 0 ? normalized : null;
};

export const normalizeAccountHolder = (value?: string | null) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = normalizeForLookup(value);
  return normalized.length > 0 ? normalized : null;
};

const resolveWalletProvider = (content: string) => {
  const normalized = normalizeForLookup(content);

  if (/MOMOW2W|MOMO|99MM/.test(normalized)) {
    return 'MoMo';
  }

  if (/ZALOPAY|99ZP/.test(normalized)) {
    return 'ZaloPay';
  }

  if (/VIETTELMONEY|VIETTEL MONEY|VTLMONEY/.test(normalized)) {
    return 'Viettel Money';
  }

  if (/VNPTMONEY|VNPT MONEY/.test(normalized)) {
    return 'VNPT Money';
  }

  return null;
};

const resolveBankFromBin = (bankBin?: string | null) => {
  if (!bankBin) {
    return null;
  }

  return Banks.find((bank) => bank.bin === bankBin) ?? null;
};

const isReliableAccountHolderCandidate = (
  candidate: string | null,
  bank: (typeof Banks)[number] | null,
  providerName?: string | null,
  bankCode?: string | null,
  bankBin?: string | null,
) => {
  const normalizedCandidate = normalizeAccountHolder(candidate);

  if (!normalizedCandidate) {
    return null;
  }

  if (normalizedCandidate.length <= 4) {
    return null;
  }

  if (!bank) {
    return normalizedCandidate;
  }

  const disallowedValues = [
    bankCode ?? bank.code,
    bankBin ?? bank.bin,
    providerName ?? bank.shortName,
    bank.shortName,
    bank.name,
  ]
    .map((value) => normalizeAccountHolder(value))
    .filter((value): value is string => Boolean(value));

  if (disallowedValues.includes(normalizedCandidate)) {
    return null;
  }

  return normalizedCandidate;
};

const extractAccountHolder = (qrPay: QRPay, bank: (typeof Banks)[number] | null) => {
  const candidate = qrPay.additionalData?.customerLabel || qrPay.merchant?.name || null;
  return isReliableAccountHolderCandidate(candidate, bank);
};

export const sanitizeBankQrAnalysis = (analysis: BankQrAnalysis): BankQrAnalysis => {
  if (analysis.destinationType !== 'BANK') {
    return {
      ...analysis,
      accountHolder: null,
    };
  }

  const matchedBank =
    (analysis.bankBin ? resolveBankFromBin(analysis.bankBin) : null)
    ?? (analysis.bankCode ? Banks.find((bank) => normalizeBankCode(bank.code) === analysis.bankCode) ?? null : null);

  return {
    ...analysis,
    accountHolder: isReliableAccountHolderCandidate(
      analysis.accountHolder,
      matchedBank,
      analysis.providerName,
      analysis.bankCode,
      analysis.bankBin,
    ),
  };
};

export const analyzeBankQrContent = (content: string): BankQrAnalysis => {
  const rawContent = normalizeWhitespace(content);
  const walletProvider = resolveWalletProvider(rawContent);

  try {
    const qrPay = new QRPay(rawContent);
    const bankBin = qrPay.consumer?.bankBin?.trim() || null;
    const accountNumber = normalizeAccountNumber(qrPay.consumer?.bankNumber || null);
    const bank = resolveBankFromBin(bankBin);

    if (bank && accountNumber) {
      return sanitizeBankQrAnalysis({
        rawContent,
        destinationType: 'BANK',
        providerName: bank.shortName,
        walletProvider: null,
        bankBin,
        bankCode: normalizeBankCode(bank.code),
        accountNumber,
        accountHolder: extractAccountHolder(qrPay, bank),
      });
    }
  } catch {
    // Fall through to wallet / unknown classification.
  }

  if (walletProvider) {
    return {
      rawContent,
      destinationType: 'WALLET',
      providerName: walletProvider,
      walletProvider,
      bankBin: null,
      bankCode: null,
      accountNumber: null,
      accountHolder: null,
    };
  }

  return {
    rawContent,
    destinationType: 'UNKNOWN',
    providerName: null,
    walletProvider: null,
    bankBin: null,
    bankCode: null,
    accountNumber: null,
    accountHolder: null,
  };
};

export const compareBankFormWithQrAnalysis = (
  form: ComparableBankForm,
  analysis: BankQrAnalysis,
): BankQrComparison => {
  const issues: BankQrMismatchIssue[] = [];

  if (analysis.destinationType !== 'BANK') {
    issues.push('HARD_TYPE_MISMATCH');
    return {
      issues,
      highestSeverity: 'BLOCKING',
    };
  }

  const normalizedBankCode = normalizeBankCode(form.bankCode);
  const normalizedAccountNumber = normalizeAccountNumber(form.accountNumber);
  const normalizedAccountHolder = normalizeAccountHolder(form.accountHolder);

  if (!normalizedBankCode || analysis.bankCode !== normalizedBankCode) {
    issues.push('SOFT_BANK_MISMATCH');
  }

  if (!normalizedAccountNumber || analysis.accountNumber !== normalizedAccountNumber) {
    issues.push('ACCOUNT_MISMATCH');
  }

  if (analysis.accountHolder && normalizedAccountHolder !== analysis.accountHolder) {
    issues.push('NAME_MISMATCH');
  }

  return {
    issues,
    highestSeverity:
      issues.length === 0
        ? 'NONE'
        : issues.includes('HARD_TYPE_MISMATCH')
          ? 'BLOCKING'
          : 'REVIEW',
  };
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
      reject(new Error('Không thể đọc nội dung mã QR từ ảnh đã tải lên.'));
    };

    image.src = objectUrl;
  });

export const decodeBankQrContentFromFile = async (file: File) => {
  const image = await loadImageElement(file);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    throw new Error('Không thể đọc nội dung mã QR từ ảnh đã tải lên.');
  }

  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const qrResult = jsQR(imageData.data, canvas.width, canvas.height, {
    inversionAttempts: 'attemptBoth',
  });

  if (!qrResult?.data) {
    throw new Error('Không đọc được nội dung mã QR sau khi chuẩn hóa.');
  }

  return qrResult.data;
};
