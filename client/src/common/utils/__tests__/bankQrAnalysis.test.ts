import { describe, expect, it } from 'vitest';
import { QRPay } from 'vietnam-qr-pay';
import { analyzeBankQrContent, compareBankFormWithQrAnalysis, sanitizeBankQrAnalysis } from '../bankQrAnalysis';

describe('bankQrAnalysis', () => {
  it('classifies a VietQR bank payload as BANK', () => {
    const content = QRPay.initVietQR({
      bankBin: '970436',
      bankNumber: '123456789',
      purpose: 'Refund',
    }).build();

    const analysis = analyzeBankQrContent(content);

    expect(analysis.destinationType).toBe('BANK');
    expect(analysis.bankCode).toBe('VCB');
    expect(analysis.accountNumber).toBe('123456789');
    expect(analysis.providerName).toBe('Vietcombank');
  });

  it('classifies a MoMo payload as WALLET', () => {
    const analysis = analyzeBankQrContent('00020101021138570010A000000727012700069704220114MOMOW2W1234567890208QRIBFTTA53037045802VN6304ABCD');

    expect(analysis.destinationType).toBe('WALLET');
    expect(analysis.walletProvider).toBe('MoMo');
  });

  it('classifies an unknown payload as UNKNOWN', () => {
    const analysis = analyzeBankQrContent('SOME-UNRECOGNIZED-CONTENT');

    expect(analysis.destinationType).toBe('UNKNOWN');
  });

  it('returns hard mismatch for wallet QR in bank form', () => {
    const comparison = compareBankFormWithQrAnalysis(
      {
        bankCode: 'VCB',
        accountNumber: '123456789',
        accountHolder: 'NGUYEN VAN A',
      },
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

    expect(comparison).toEqual({
      issues: ['HARD_TYPE_MISMATCH'],
      highestSeverity: 'BLOCKING',
    });
  });

  it('returns review issues for bank/account/name mismatches', () => {
    const comparison = compareBankFormWithQrAnalysis(
      {
        bankCode: 'VCB',
        accountNumber: '123456789',
        accountHolder: 'NGUYEN VAN A',
      },
      {
        rawContent: 'bank',
        destinationType: 'BANK',
        providerName: 'Techcombank',
        walletProvider: null,
        bankBin: '970407',
        bankCode: 'TCB',
        accountNumber: '987654321',
        accountHolder: 'TRAN VAN B',
      },
    );

    expect(comparison).toEqual({
      issues: ['SOFT_BANK_MISMATCH', 'ACCOUNT_MISMATCH', 'NAME_MISMATCH'],
      highestSeverity: 'REVIEW',
    });
  });

  it('returns no mismatch when bank data matches QR analysis', () => {
    const comparison = compareBankFormWithQrAnalysis(
      {
        bankCode: 'VCB',
        accountNumber: '1234 56789',
        accountHolder: 'Nguyễn Văn A',
      },
      {
        rawContent: 'bank',
        destinationType: 'BANK',
        providerName: 'Vietcombank',
        walletProvider: null,
        bankBin: '970436',
        bankCode: 'VCB',
        accountNumber: '123456789',
        accountHolder: 'NGUYEN VAN A',
      },
    );

    expect(comparison).toEqual({
      issues: [],
      highestSeverity: 'NONE',
    });
  });

  it('drops suspicious account holder values that are actually bank identifiers', () => {
    const analysis = sanitizeBankQrAnalysis({
      rawContent: 'bank',
      destinationType: 'BANK',
      providerName: 'Techcombank',
      walletProvider: null,
      bankBin: '970407',
      bankCode: 'TCB',
      accountNumber: '19072976331011',
      accountHolder: 'TCB',
    });

    expect(analysis.accountHolder).toBeNull();
  });
});
