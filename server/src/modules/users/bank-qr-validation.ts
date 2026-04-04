import jwt from 'jsonwebtoken';
import { Banks, QRPay } from 'vietnam-qr-pay';
import { env } from '../../lib/env';

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

type ComparableBankAccount = {
  bankCode?: string | null;
  accountNumber: string;
  accountHolder: string;
};

type BankQrValidationTokenPayload = {
  purpose: 'BANK_QR_VALIDATION';
  userId: number;
  qrImageUrl: string;
  analysis: BankQrAnalysis;
  iat?: number;
  exp?: number;
};

const BANK_QR_VALIDATION_TTL = '2h';

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
    // Fall through to wallet/unknown classification below.
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

export const compareBankAccountWithQrAnalysis = (
  account: ComparableBankAccount,
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

  const normalizedBankCode = normalizeBankCode(account.bankCode);
  const normalizedAccountNumber = normalizeAccountNumber(account.accountNumber);
  const normalizedAccountHolder = normalizeAccountHolder(account.accountHolder);

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

export const createBankQrValidationToken = (userId: number, qrImageUrl: string, analysis: BankQrAnalysis) =>
  jwt.sign(
    {
      purpose: 'BANK_QR_VALIDATION',
      userId,
      qrImageUrl,
      analysis,
    } satisfies BankQrValidationTokenPayload,
    env.jwtSecret,
    { expiresIn: BANK_QR_VALIDATION_TTL },
  );

export const verifyBankQrValidationToken = (
  token: string,
  userId: number,
  qrImageUrl: string,
) => {
  const decoded = jwt.verify(token, env.jwtSecret) as BankQrValidationTokenPayload;

  if (
    decoded.purpose !== 'BANK_QR_VALIDATION' ||
    decoded.userId !== userId ||
    decoded.qrImageUrl !== qrImageUrl
  ) {
    throw new Error('BANK_QR_ANALYSIS_INVALID');
  }

  return decoded.analysis;
};
