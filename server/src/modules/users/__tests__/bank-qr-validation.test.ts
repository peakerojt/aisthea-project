import { sanitizeBankQrAnalysis } from '../bank-qr-validation';

describe('bank-qr-validation', () => {
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
