import React from 'react';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const showToastMock = vi.fn();
const getBankAccountsMock = vi.fn();
const createBankAccountMock = vi.fn();
const uploadBankQrImageMock = vi.fn();
const normalizeBankQrImageMock = vi.fn();
const compressImageMock = vi.fn();
const fileToBase64Mock = vi.fn();
const decodeBankQrContentFromFileMock = vi.fn();

vi.mock('@/common/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: showToastMock,
  }),
}));

vi.mock('@/store/services/user.service', () => ({
  userService: {
    getBankAccounts: (...args: unknown[]) => getBankAccountsMock(...args),
    createBankAccount: (...args: unknown[]) => createBankAccountMock(...args),
    updateBankAccount: vi.fn(),
    setDefaultBankAccount: vi.fn(),
    deleteBankAccount: vi.fn(),
    uploadBankQrImage: (...args: unknown[]) => uploadBankQrImageMock(...args),
  },
}));

vi.mock('@/common/utils/imageCompression', () => ({
  compressImage: (...args: unknown[]) => compressImageMock(...args),
  fileToBase64: (...args: unknown[]) => fileToBase64Mock(...args),
}));

vi.mock('@/common/utils/bankQrNormalization', () => ({
  BankQrNormalizationError: class BankQrNormalizationError extends Error {
    code: string;

    constructor(code: string, message: string) {
      super(message);
      this.name = 'BankQrNormalizationError';
      this.code = code;
    }
  },
  normalizeBankQrImage: (...args: unknown[]) => normalizeBankQrImageMock(...args),
}));

vi.mock('@/common/utils/bankQrAnalysis', async () => {
  const actual = await vi.importActual<typeof import('@/common/utils/bankQrAnalysis')>('@/common/utils/bankQrAnalysis');
  return {
    ...actual,
    decodeBankQrContentFromFile: (...args: unknown[]) => decodeBankQrContentFromFileMock(...args),
  };
});

let ProfileBankAccountsSection: typeof import('@/store/components/profile/ProfileBankAccountsSection').ProfileBankAccountsSection;

describe('ProfileBankAccountsSection', () => {
  beforeAll(async () => {
    ({ ProfileBankAccountsSection } = await import('@/store/components/profile/ProfileBankAccountsSection'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getBankAccountsMock.mockResolvedValue([]);
    createBankAccountMock.mockResolvedValue({
      bankAccountId: 1,
      bankName: 'Vietcombank',
      bankCode: 'VCB',
      accountNumberMasked: '****6789',
      accountHolder: 'Nguyen Van A',
      qrImageUrl: null,
      inputMethod: 'MANUAL',
      isDefault: true,
      isActive: true,
      updatedAt: '2026-04-03T08:00:00.000Z',
      createdAt: '2026-04-03T08:00:00.000Z',
    });
    uploadBankQrImageMock.mockResolvedValue({
      fileUrl: 'https://example.com/bank-qr.png',
      fileName: 'bank-qr.png',
      qrValidationToken: 'validated-bank-qr-token',
      qrAnalysis: {
        rawContent: 'BANK-QR-CONTENT',
        destinationType: 'BANK',
        providerName: 'Vietcombank',
        walletProvider: null,
        bankBin: '970436',
        bankCode: 'VCB',
        accountNumber: '123456789',
        accountHolder: 'NGUYEN VAN A',
      },
    });
    normalizeBankQrImageMock.mockImplementation(async (file: File) => new File([file], 'bank-qr-normalized.png', { type: 'image/png' }));
    compressImageMock.mockImplementation(async (file: File) => ({
      file,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 1,
    }));
    fileToBase64Mock.mockResolvedValue('data:image/png;base64,bank-qr');
    decodeBankQrContentFromFileMock.mockResolvedValue('BANK-QR-CONTENT');
  });

  afterEach(() => {
    cleanup();
  });

  it('creates a manual bank account from the profile form', async () => {
    render(<ProfileBankAccountsSection />);

    await userEvent.click(await screen.findByRole('button', { name: 'Tạo tài khoản đầu tiên' }));

    const formCard = screen.getByText('Thêm tài khoản ngân hàng mới').closest('div.mt-6');
    expect(formCard).not.toBeNull();

    const bankNameInput = within(formCard as HTMLElement).getByLabelText('Tên ngân hàng');
    const bankCodeInput = within(formCard as HTMLElement).getByLabelText('Mã ngân hàng');
    const accountNumberInput = within(formCard as HTMLElement).getByLabelText('Số tài khoản');
    const accountHolderInput = within(formCard as HTMLElement).getByLabelText('Chủ tài khoản');

    await userEvent.type(bankNameInput, 'Vietcombank');
    await waitFor(() => {
      expect(bankCodeInput).toHaveValue('VCB');
    });
    await userEvent.type(accountNumberInput, '123456789');
    await userEvent.type(accountHolderInput, 'Nguyễn Văn A');
    expect(accountHolderInput).toHaveValue('NGUYEN VAN A');

    await userEvent.click(screen.getByRole('button', { name: 'Thêm tài khoản' }));

    expect(await screen.findByRole('heading', { name: 'Xác nhận thêm tài khoản' })).toBeInTheDocument();
    expect(createBankAccountMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận thêm tài khoản' }));

    await waitFor(() => {
      expect(createBankAccountMock).toHaveBeenCalledWith({
        bankName: 'Vietcombank',
        bankCode: 'VCB',
        accountNumber: '123456789',
        accountHolder: 'NGUYEN VAN A',
        inputMethod: 'MANUAL',
      });
    });

    expect(showToastMock).toHaveBeenCalledWith({
      type: 'success',
      title: 'Đã thêm tài khoản nhận hoàn.',
    });
  });

  it('shows the full bank list in a scrollable dropdown viewport', async () => {
    render(<ProfileBankAccountsSection />);

    await userEvent.click(await screen.findByRole('button', { name: 'Tạo tài khoản đầu tiên' }));

    const bankNameInput = screen.getByLabelText('Tên ngân hàng');
    await userEvent.click(bankNameInput);

    expect(await screen.findByText('VietinBank')).toBeInTheDocument();
    expect(screen.getByText('Vietcombank')).toBeInTheDocument();
    expect(screen.getByText('BIDV')).toBeInTheDocument();
    expect(screen.getByText('Agribank')).toBeInTheDocument();
    expect(screen.getByText('OCB')).toBeInTheDocument();
    expect(screen.getByText('VPBank')).toBeInTheDocument();
    expect(screen.queryByText('MoMo')).not.toBeInTheDocument();
    expect(screen.queryByText(/Khu vực gợi ý hiển thị/i)).not.toBeInTheDocument();
  });

  it('renders skeleton cards instead of loading text while fetching accounts', () => {
    getBankAccountsMock.mockReturnValue(new Promise(() => undefined));

    const { container } = render(<ProfileBankAccountsSection />);

    expect(screen.queryByText('Đang tải tài khoản ngân hàng...')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('uploads a QR image and saves it as optional bank metadata', async () => {
    render(<ProfileBankAccountsSection />);

    await userEvent.click(await screen.findByRole('button', { name: 'Tạo tài khoản đầu tiên' }));

    await userEvent.type(screen.getByLabelText('Tên ngân hàng'), 'Vietcombank');
    await userEvent.type(screen.getByLabelText('Số tài khoản'), '123456789');
    const accountHolderInput = screen.getByLabelText('Chủ tài khoản');
    await userEvent.type(accountHolderInput, 'Nguyễn Văn A');
    expect(accountHolderInput).toHaveValue('NGUYEN VAN A');

    const fileInput = screen.getByLabelText('Tải QR');
    const qrFile = new File(['qr-image'], 'bank-qr.png', { type: 'image/png' });

    await userEvent.upload(fileInput, qrFile);

    const normalizedFile = await normalizeBankQrImageMock.mock.results[0]?.value;

    await waitFor(() => {
      expect(normalizeBankQrImageMock).toHaveBeenCalledWith(qrFile);
      expect(decodeBankQrContentFromFileMock).toHaveBeenCalledWith(normalizedFile);
      expect(compressImageMock).toHaveBeenCalledWith(normalizedFile, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        initialQuality: 0.92,
        useWebWorker: true,
      });
      expect(fileToBase64Mock).toHaveBeenCalledWith(normalizedFile);
    });

    expect(normalizeBankQrImageMock.mock.invocationCallOrder[0]).toBeLessThan(compressImageMock.mock.invocationCallOrder[0]);
    expect(compressImageMock.mock.invocationCallOrder[0]).toBeLessThan(fileToBase64Mock.mock.invocationCallOrder[0]);
    expect(uploadBankQrImageMock).toHaveBeenCalledWith('data:image/png;base64,bank-qr', 'bank-qr-normalized.png', 'BANK-QR-CONTENT');
    expect(await screen.findByAltText('QR ngân hàng')).toHaveAttribute('src', 'https://example.com/bank-qr.png');
    expect(screen.getByText('Đã nhận diện QR ngân hàng')).toBeInTheDocument();
    expect(screen.getByText('Khớp')).toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith({
      type: 'success',
      title: 'Đã nhận diện QR và cập nhật thông tin khả dụng.',
    });

    await userEvent.click(screen.getByRole('button', { name: 'Thêm tài khoản' }));

    expect(await screen.findByRole('heading', { name: 'Xác nhận thêm tài khoản' })).toBeInTheDocument();
    expect(createBankAccountMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận thêm tài khoản' }));

    await waitFor(() => {
      expect(createBankAccountMock).toHaveBeenCalledWith({
        bankName: 'Vietcombank',
        bankCode: 'VCB',
        accountNumber: '123456789',
        accountHolder: 'NGUYEN VAN A',
        qrImageUrl: 'https://example.com/bank-qr.png',
        qrValidationToken: 'validated-bank-qr-token',
        inputMethod: 'QR_IMAGE',
      });
    });
  });

  it('does not autofill account holder when the QR analysis only returns a bank identifier', async () => {
    uploadBankQrImageMock.mockResolvedValueOnce({
      fileUrl: 'https://example.com/tcb-qr.png',
      fileName: 'tcb-qr.png',
      qrValidationToken: 'validated-tcb-qr-token',
      qrAnalysis: {
        rawContent: 'BANK-QR-CONTENT',
        destinationType: 'BANK',
        providerName: 'Techcombank',
        walletProvider: null,
        bankBin: '970407',
        bankCode: 'TCB',
        accountNumber: '19072976331011',
        accountHolder: 'TCB',
      },
    });

    render(<ProfileBankAccountsSection />);

    await userEvent.click(await screen.findByRole('button', { name: 'Tạo tài khoản đầu tiên' }));

    const fileInput = screen.getByLabelText('Tải QR');
    await userEvent.upload(fileInput, new File(['qr-image'], 'tcb-qr.png', { type: 'image/png' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Tên ngân hàng')).toHaveValue('Techcombank');
      expect(screen.getByLabelText('Mã ngân hàng')).toHaveValue('TCB');
      expect(screen.getByLabelText('Số tài khoản')).toHaveValue('19072976331011');
    });

    expect(screen.getByLabelText('Chủ tài khoản')).toHaveValue('');
    expect(screen.getByText('Không có dữ liệu trong QR')).toBeInTheDocument();
    expect(screen.getByText(/QR này không chứa tên chủ tài khoản/i)).toBeInTheDocument();
  });

  it('falls back to the normalized QR file when compression fails', async () => {
    compressImageMock.mockRejectedValueOnce(new Error('compression failed'));

    render(<ProfileBankAccountsSection />);

    await userEvent.click(await screen.findByRole('button', { name: 'Tạo tài khoản đầu tiên' }));

    const fileInput = screen.getByLabelText('Tải QR');
    const qrFile = new File(['qr-image'], 'bank-qr.png', { type: 'image/png' });

    await userEvent.upload(fileInput, qrFile);

    const normalizedFile = await normalizeBankQrImageMock.mock.results[0]?.value;

    await waitFor(() => {
      expect(fileToBase64Mock).toHaveBeenCalledWith(normalizedFile);
    });

    expect(uploadBankQrImageMock).toHaveBeenCalledWith('data:image/png;base64,bank-qr', 'bank-qr-normalized.png', 'BANK-QR-CONTENT');
  });

  it('autofills empty bank fields from a detected bank QR before saving', async () => {
    render(<ProfileBankAccountsSection />);

    await userEvent.click(await screen.findByRole('button', { name: 'Tạo tài khoản đầu tiên' }));

    const fileInput = screen.getByLabelText('Tải QR');
    await userEvent.upload(fileInput, new File(['bank-qr'], 'bank-qr.png', { type: 'image/png' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Tên ngân hàng')).toHaveValue('Vietcombank');
      expect(screen.getByLabelText('Mã ngân hàng')).toHaveValue('VCB');
      expect(screen.getByLabelText('Số tài khoản')).toHaveValue('123456789');
      expect(screen.getByLabelText('Chủ tài khoản')).toHaveValue('NGUYEN VAN A');
    });

    expect(screen.getByText('1234****789')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm tài khoản' })).not.toBeDisabled();
  });

  it('opens the review modal and blocks confirmation when account holder is still missing', async () => {
    uploadBankQrImageMock.mockResolvedValueOnce({
      fileUrl: 'https://example.com/tcb-qr.png',
      fileName: 'tcb-qr.png',
      qrValidationToken: 'validated-tcb-qr-token',
      qrAnalysis: {
        rawContent: 'BANK-QR-CONTENT',
        destinationType: 'BANK',
        providerName: 'Techcombank',
        walletProvider: null,
        bankBin: '970407',
        bankCode: 'TCB',
        accountNumber: '19072976331011',
        accountHolder: null,
      },
    });

    render(<ProfileBankAccountsSection />);

    await userEvent.click(await screen.findByRole('button', { name: 'Tạo tài khoản đầu tiên' }));
    await userEvent.upload(screen.getByLabelText('Tải QR'), new File(['qr-image'], 'tcb-qr.png', { type: 'image/png' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Tên ngân hàng')).toHaveValue('Techcombank');
      expect(screen.getByLabelText('Mã ngân hàng')).toHaveValue('TCB');
      expect(screen.getByLabelText('Số tài khoản')).toHaveValue('19072976331011');
    });

    expect(screen.getByLabelText('Chủ tài khoản')).toHaveValue('');

    await userEvent.click(screen.getByRole('button', { name: 'Thêm tài khoản' }));

    expect(await screen.findByRole('heading', { name: 'Xác nhận thêm tài khoản' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xác nhận thêm tài khoản' })).toBeDisabled();
    expect(createBankAccountMock).not.toHaveBeenCalled();
  });

  it('blocks upload and shows guidance when QR detection fails', async () => {
    normalizeBankQrImageMock.mockRejectedValueOnce(new Error('Không nhận diện được mã QR trong ảnh.'));

    render(<ProfileBankAccountsSection />);

    await userEvent.click(await screen.findByRole('button', { name: 'Tạo tài khoản đầu tiên' }));

    const fileInput = screen.getByLabelText('Tải QR');
    const qrFile = new File(['qr-image'], 'bank-qr.png', { type: 'image/png' });

    await userEvent.upload(fileInput, qrFile);

    expect(await screen.findByText('Không nhận diện được mã QR trong ảnh.')).toBeInTheDocument();
    expect(compressImageMock).not.toHaveBeenCalled();
    expect(fileToBase64Mock).not.toHaveBeenCalled();
    expect(uploadBankQrImageMock).not.toHaveBeenCalled();
  });

  it('blocks saving when the uploaded QR is a wallet instead of a bank account', async () => {
    uploadBankQrImageMock.mockResolvedValueOnce({
      fileUrl: 'https://example.com/momo-qr.png',
      fileName: 'momo-qr.png',
      qrValidationToken: 'wallet-token',
      qrAnalysis: {
        rawContent: 'MOMOW2W',
        destinationType: 'WALLET',
        providerName: 'MoMo',
        walletProvider: 'MoMo',
        bankBin: null,
        bankCode: null,
        accountNumber: null,
        accountHolder: null,
      },
    });

    render(<ProfileBankAccountsSection />);

    await userEvent.click(await screen.findByRole('button', { name: 'Tạo tài khoản đầu tiên' }));
    await userEvent.type(screen.getByLabelText('Tên ngân hàng'), 'Vietcombank');
    await userEvent.type(screen.getByLabelText('Số tài khoản'), '123456789');
    await userEvent.type(screen.getByLabelText('Chủ tài khoản'), 'Nguyễn Văn A');

    const fileInput = screen.getByLabelText('Tải QR');
    await userEvent.upload(fileInput, new File(['wallet-qr'], 'momo-qr.png', { type: 'image/png' }));

    expect(await screen.findByText(/QR đã tải lên thuộc ví điện tử MoMo/i)).toBeInTheDocument();
    expect(screen.getByText('Đã nhận diện QR ví điện tử')).toBeInTheDocument();
    expect(screen.getByText('MoMo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Giữ dữ liệu đã nhập' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm tài khoản' })).toBeDisabled();
    expect(createBankAccountMock).not.toHaveBeenCalled();
  });

  it('offers QR review actions when the uploaded bank code does not match the form', async () => {
    uploadBankQrImageMock.mockResolvedValueOnce({
      fileUrl: 'https://example.com/tcb-qr.png',
      fileName: 'tcb-qr.png',
      qrValidationToken: 'tcb-token',
      qrAnalysis: {
        rawContent: 'TCB-QR',
        destinationType: 'BANK',
        providerName: 'Techcombank',
        walletProvider: null,
        bankBin: '970407',
        bankCode: 'TCB',
        accountNumber: '987654321',
        accountHolder: 'TRAN VAN B',
      },
    });

    render(<ProfileBankAccountsSection />);

    await userEvent.click(await screen.findByRole('button', { name: 'Tạo tài khoản đầu tiên' }));
    await userEvent.type(screen.getByLabelText('Tên ngân hàng'), 'Vietcombank');
    await userEvent.type(screen.getByLabelText('Số tài khoản'), '123456789');
    await userEvent.type(screen.getByLabelText('Chủ tài khoản'), 'Nguyễn Văn A');

    const fileInput = screen.getByLabelText('Tải QR');
    await userEvent.upload(fileInput, new File(['bank-qr'], 'tcb-qr.png', { type: 'image/png' }));

    expect(await screen.findByRole('button', { name: 'Dùng dữ liệu từ QR' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Giữ dữ liệu đã nhập' })).toBeInTheDocument();
    expect(screen.getByText('Đã nhận diện QR ngân hàng')).toBeInTheDocument();
    expect(screen.getByText('Không khớp')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm tài khoản' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Dùng dữ liệu từ QR' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Mã ngân hàng')).toHaveValue('TCB');
      expect(screen.getByLabelText('Số tài khoản')).toHaveValue('987654321');
      expect(screen.getByLabelText('Chủ tài khoản')).toHaveValue('TRAN VAN B');
    });

    expect(screen.getByRole('button', { name: 'Thêm tài khoản' })).not.toBeDisabled();
  });

  it('clears an unverified conflicting QR when keeping the current form', async () => {
    getBankAccountsMock.mockResolvedValueOnce([
      {
        bankAccountId: 9,
        bankName: 'Techcombank',
        bankCode: 'TCB',
        accountNumberMasked: '****3011',
        accountHolder: 'TCB',
        qrImageUrl: 'https://example.com/existing-bank-qr.png',
        inputMethod: 'QR_IMAGE',
        isDefault: true,
        isActive: true,
        updatedAt: '2026-04-03T08:00:00.000Z',
        createdAt: '2026-04-03T08:00:00.000Z',
      },
    ]);

    render(<ProfileBankAccountsSection />);

    await userEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa' }));

    uploadBankQrImageMock.mockResolvedValueOnce({
      fileUrl: 'https://example.com/conflict-qr.png',
      fileName: 'conflict-qr.png',
      qrValidationToken: 'conflict-token',
      qrAnalysis: {
        rawContent: 'VCB-QR',
        destinationType: 'BANK',
        providerName: 'Vietcombank',
        walletProvider: null,
        bankBin: '970436',
        bankCode: 'VCB',
        accountNumber: '123456789',
        accountHolder: null,
      },
    });

    const fileInput = screen.getByLabelText('Tải QR');
    await userEvent.upload(fileInput, new File(['bank-qr'], 'conflict-qr.png', { type: 'image/png' }));

    expect(await screen.findByText(/không khớp với ngân hàng TCB đang nhập/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Giữ dữ liệu đã nhập' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Giữ dữ liệu đã nhập' }));

    expect(screen.queryByText(/không khớp với ngân hàng TCB đang nhập/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Giữ dữ liệu đã nhập' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('bank-qr-form-preview')).not.toBeInTheDocument();
    expect(screen.getByTestId('bank-qr-form-empty')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu cập nhật' })).not.toBeDisabled();
  });

  it('shows a note when the QR does not contain account holder information', async () => {
    uploadBankQrImageMock.mockResolvedValueOnce({
      fileUrl: 'https://example.com/bank-qr-no-name.png',
      fileName: 'bank-qr-no-name.png',
      qrValidationToken: 'no-name-token',
      qrAnalysis: {
        rawContent: 'BANK-QR-CONTENT',
        destinationType: 'BANK',
        providerName: 'Vietcombank',
        walletProvider: null,
        bankBin: '970436',
        bankCode: 'VCB',
        accountNumber: '123456789',
        accountHolder: null,
      },
    });

    render(<ProfileBankAccountsSection />);

    await userEvent.click(await screen.findByRole('button', { name: 'Tạo tài khoản đầu tiên' }));
    await userEvent.type(screen.getByLabelText('Tên ngân hàng'), 'Vietcombank');
    await userEvent.type(screen.getByLabelText('Số tài khoản'), '123456789');
    await userEvent.type(screen.getByLabelText('Chủ tài khoản'), 'Nguyễn Văn A');

    const fileInput = screen.getByLabelText('Tải QR');
    await userEvent.upload(fileInput, new File(['bank-qr'], 'bank-qr-no-name.png', { type: 'image/png' }));

    expect(await screen.findByText('QR này không chứa tên chủ tài khoản. Hệ thống chỉ đối chiếu được ngân hàng và số tài khoản.')).toBeInTheDocument();
    expect(screen.getByText('Không đủ dữ liệu để kiểm tra tên')).toBeInTheDocument();
    expect(screen.getByText('Không có dữ liệu trong QR')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm tài khoản' })).not.toBeDisabled();
  });
});
