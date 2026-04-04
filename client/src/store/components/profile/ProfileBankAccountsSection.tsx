import React, { useEffect, useState } from 'react';
import { ChevronDown, Landmark, Pencil, Plus, QrCode, Star, Trash2 } from 'lucide-react';
import { ZodError } from 'zod';
import { filterVietnamBankOptionsInList, findVietnamBankOptionByCodeInList, findVietnamBankOptionInList, getVietnamBankDisplayLabel, loadVietnamBankOptions, type VietnamBankOption } from '@/common/constants/vietnamBanks';
import { useToast } from '@/common/contexts/ToastContext';
import {
  sanitizeBankQrAnalysis,
  compareBankFormWithQrAnalysis,
  decodeBankQrContentFromFile,
  normalizeAccountHolder,
  normalizeAccountNumber,
  normalizeBankCode,
  type BankQrAnalysis,
  type BankQrComparison,
} from '@/common/utils/bankQrAnalysis';
import { type FieldErrorMap, firstFieldError, mapZodFieldErrors } from '@/common/validation/errors';
import { bankAccountClientSchema } from '@/common/validation/schemas';
import { getCloudinaryQrImage } from '@/common/utils/cloudinary';
import { BankQrNormalizationError, normalizeBankQrImage } from '@/common/utils/bankQrNormalization';
import { compressImage, fileToBase64 } from '@/common/utils/imageCompression';
import { type BankAccount, type BankQrUploadResult, userService } from '@/store/services/user.service';

const surfaceClassName = 'rounded-sm border border-white/5 bg-surface-dark';
const elevatedCardClassName = 'rounded-sm border border-white/10 bg-black/20 shadow-[0_12px_28px_rgba(0,0,0,0.14)] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-black/25 hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)]';
const inputClassName = 'w-full rounded border bg-black/25 px-4 py-3 text-sm text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20';
const fieldLabelClassName = 'mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300';
const defaultInputBorderClassName = 'border-white/10 focus:border-primary/50';
const errorInputBorderClassName = 'border-red-500/70 focus:border-red-400';
const fieldErrorClassName = 'mt-2 text-xs text-red-300';
const formErrorClassName = 'rounded border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200';
const subtleButtonClassName = 'border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-xs font-bold uppercase tracking-widest';
const solidPrimaryButtonClassName = 'bg-primary/15 text-primary hover:bg-primary hover:text-white transition-all text-xs font-bold uppercase tracking-widest border border-primary/30 shadow-[0_0_18px_rgba(239,68,68,0.12)]';

type BankAccountFormState = {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  qrImageUrl: string;
  qrValidationToken: string;
  makeDefault: boolean;
};

type PendingQrUploadState = BankQrUploadResult;
type AutofillField = 'bankName' | 'bankCode' | 'accountNumber' | 'accountHolder';
type BankAccountSavePayload = {
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  accountHolder: string;
  qrImageUrl?: string;
  qrValidationToken?: string;
  inputMethod: 'QR_IMAGE' | 'MANUAL';
};
type SaveReviewState = {
  payload: BankAccountSavePayload;
  makeDefault: boolean;
};

const defaultFormState: BankAccountFormState = {
  bankName: '',
  bankCode: '',
  accountNumber: '',
  accountHolder: '',
  qrImageUrl: '',
  qrValidationToken: '',
  makeDefault: false,
};

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('vi-VN') : '—';

const maxVisibleBankSuggestions = 4;
const bankSuggestionViewportMaxHeightRem = maxVisibleBankSuggestions * 5.25;
const autofillInputBorderClassName = 'border-emerald-500/50 bg-emerald-500/5 ring-2 ring-emerald-500/20';
const normalizeAccountHolderInput = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toUpperCase();

const maskAccountNumberForDisplay = (value?: string | null) => {
  if (!value) {
    return 'Không có dữ liệu';
  }

  if (value.length <= 7) {
    return value;
  }

  return `${value.slice(0, 4)}****${value.slice(-3)}`;
};

const getQrDestinationLabel = (analysis: BankQrAnalysis) => {
  if (analysis.destinationType === 'BANK') {
    return 'Ngân hàng';
  }

  if (analysis.destinationType === 'WALLET') {
    return 'Ví điện tử';
  }

  return 'Không xác định';
};

const resolveBankQrUploadErrorMessage = (error: unknown) => {
  if (error instanceof BankQrNormalizationError) {
    if (error.code === 'BANK_QR_NOT_DETECTED') {
      return 'Không nhận diện được mã QR trong ảnh. Vui lòng chụp rõ hơn, đủ sáng hơn và đảm bảo mã QR nằm trọn trong khung hình.';
    }

    return error.message;
  }

  const typedError = error as Error | { message?: string };
  return typedError.message || 'Không thể tải lên ảnh QR.';
};

const resolveBankQrSaveErrorMessage = (error: unknown) => {
  const typedError = error as Error & { code?: string };

  if (typedError.code === 'BANK_QR_TYPE_MISMATCH') {
    return 'QR đã tải lên không phải QR tài khoản ngân hàng hợp lệ. Vui lòng tải lên QR ngân hàng đúng với thông tin tài khoản.';
  }

  if (typedError.code === 'BANK_QR_BANK_CODE_MISMATCH') {
    return 'QR đã tải lên không khớp với ngân hàng đang nhập. Vui lòng cập nhật lại form theo QR hoặc tải lên QR khác.';
  }

  if (typedError.code === 'BANK_QR_ACCOUNT_MISMATCH') {
    return 'Số tài khoản trong QR không khớp với thông tin đang nhập. Vui lòng kiểm tra lại trước khi lưu.';
  }

  if (typedError.code === 'BANK_QR_NAME_MISMATCH') {
    return 'Tên chủ tài khoản trong QR không khớp với thông tin đang nhập. Vui lòng kiểm tra lại trước khi lưu.';
  }

  if (typedError.code === 'BANK_QR_ANALYSIS_INVALID') {
    return 'Ảnh QR chưa được xác thực. Vui lòng tải lại QR trước khi lưu.';
  }

  return typedError.message || 'Không thể lưu tài khoản ngân hàng.';
};

const getQrComparisonMessage = (
  comparison: BankQrComparison,
  analysis: BankQrAnalysis,
  form: Pick<BankAccountFormState, 'bankName' | 'bankCode' | 'accountNumber'>,
) => {
  const currentBankLabel = form.bankCode || form.bankName || 'đã nhập';
  const providerLabel = analysis.providerName || analysis.walletProvider || 'không xác định';

  if (comparison.issues.includes('HARD_TYPE_MISMATCH')) {
    return `QR đã tải lên thuộc ví điện tử ${providerLabel}, không phải QR tài khoản ngân hàng ${currentBankLabel}. Vui lòng tải lên QR ngân hàng đúng với thông tin tài khoản.`;
  }

  if (comparison.issues.includes('SOFT_BANK_MISMATCH')) {
    return `QR đã tải lên thuộc ngân hàng ${providerLabel}${analysis.bankCode ? ` (${analysis.bankCode})` : ''}, không khớp với ngân hàng ${currentBankLabel} đang nhập. Bạn có thể cập nhật form theo QR hoặc tải lên QR khác.`;
  }

  if (comparison.issues.includes('ACCOUNT_MISMATCH')) {
    return `Số tài khoản trong QR${analysis.accountNumber ? ` (${analysis.accountNumber})` : ''} không khớp với số tài khoản bạn đang nhập. Bạn có thể cập nhật form theo QR hoặc tải lên QR khác.`;
  }

  if (comparison.issues.includes('NAME_MISMATCH')) {
    return 'Tên chủ tài khoản trong QR không khớp với tên chủ tài khoản đang nhập. Bạn có thể cập nhật form theo QR hoặc tải lên QR khác.';
  }

  return '';
};

const LoadingAccountCards = () => (
  <div className="grid gap-4 xl:grid-cols-2" aria-hidden="true">
    {Array.from({ length: 2 }).map((_, index) => (
      <div key={`bank-account-skeleton-${index}`} className={`${elevatedCardClassName} animate-pulse overflow-hidden p-5`}>
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-6 w-40 rounded-full bg-white/10" />
              <div className="h-4 w-28 rounded-full bg-white/10" />
              <div className="h-4 w-24 rounded-full bg-white/5" />
            </div>
            <div className="h-7 w-20 rounded-full bg-white/10" />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_7rem]">
            <div className="rounded-sm border border-white/10 bg-black/20 p-4">
              <div className="space-y-3">
                <div className="h-4 w-40 rounded-full bg-white/10" />
                <div className="h-4 w-28 rounded-full bg-white/5" />
              </div>
            </div>
            <div className="min-h-28 rounded-sm border border-white/10 bg-black/20" />
          </div>

          <div className="flex gap-3">
            <div className="h-9 w-28 rounded bg-white/10" />
            <div className="h-9 w-24 rounded bg-white/5" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

type ProfileBankAccountsSectionProps = {
  isActive?: boolean;
};

export const ProfileBankAccountsSection: React.FC<ProfileBankAccountsSectionProps> = ({ isActive = true }) => {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [form, setForm] = useState<BankAccountFormState>(defaultFormState);
  const [errors, setErrors] = useState<FieldErrorMap>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [bankOptions, setBankOptions] = useState<VietnamBankOption[]>([]);
  const [loadingBankOptions, setLoadingBankOptions] = useState(false);
  const [showBankSuggestions, setShowBankSuggestions] = useState(false);
  const [attachedQrAnalysis, setAttachedQrAnalysis] = useState<BankQrAnalysis | null>(null);
  const [pendingQrUpload, setPendingQrUpload] = useState<PendingQrUploadState | null>(null);
  const [autofilledFields, setAutofilledFields] = useState<AutofillField[]>([]);
  const [saveReview, setSaveReview] = useState<SaveReviewState | null>(null);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await userService.getBankAccounts();
      setAccounts(data);
    } catch (error) {
      const typedError = error as Error | { message?: string };
      showToast({
        type: 'error',
        title: typedError.message || 'Không thể tải danh sách tài khoản ngân hàng.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAccounts();
  }, []);

  const attachedQrComparison = attachedQrAnalysis
    ? compareBankFormWithQrAnalysis(form, attachedQrAnalysis)
    : null;
  const pendingQrComparison = pendingQrUpload
    ? compareBankFormWithQrAnalysis(form, pendingQrUpload.qrAnalysis)
    : null;
  const activeQrAnalysis = pendingQrUpload?.qrAnalysis
    ?? (attachedQrComparison && attachedQrComparison.highestSeverity !== 'NONE' ? attachedQrAnalysis : null);
  const activeQrComparison = pendingQrUpload
    ? pendingQrComparison
    : attachedQrComparison && attachedQrComparison.highestSeverity !== 'NONE'
      ? attachedQrComparison
      : null;
  const activeQrReviewSource = pendingQrUpload ? 'pending' : activeQrComparison ? 'attached' : null;
  const qrReviewMessage = activeQrAnalysis && activeQrComparison
    ? getQrComparisonMessage(activeQrComparison, activeQrAnalysis, form)
    : '';
  const displayedQrAnalysis = pendingQrUpload?.qrAnalysis ?? attachedQrAnalysis;
  const displayedQrComparison = displayedQrAnalysis
    ? compareBankFormWithQrAnalysis(form, displayedQrAnalysis)
    : null;
  const displayedQrImageUrl = pendingQrUpload?.fileUrl || form.qrImageUrl;
  const saveReviewValidation = saveReview
    ? bankAccountClientSchema.safeParse(saveReview.payload)
    : null;
  const saveReviewValidationMessage = saveReviewValidation && !saveReviewValidation.success
    ? firstFieldError(mapZodFieldErrors(saveReviewValidation.error)) || 'Thông tin tài khoản chưa hợp lệ.'
    : '';
  const qrMissingAccountHolderMessage = (() => {
    if (!displayedQrImageUrl) {
      return '';
    }

    const analysisForNote = displayedQrAnalysis;
    if (!analysisForNote || analysisForNote.destinationType !== 'BANK' || analysisForNote.accountHolder) {
      return '';
    }

    return 'QR này không chứa tên chủ tài khoản. Hệ thống chỉ đối chiếu được ngân hàng và số tài khoản.';
  })();
  const isSaveDisabled = saving || uploadingQr || Boolean(activeQrComparison);
  const qrSummaryStatusLabel = (() => {
    if (!displayedQrAnalysis) {
      return '';
    }

    if (displayedQrAnalysis.destinationType !== 'BANK') {
      return 'Không khớp';
    }

    if (displayedQrComparison && displayedQrComparison.highestSeverity !== 'NONE') {
      return 'Không khớp';
    }

    if (!displayedQrAnalysis.accountHolder) {
      return 'Không đủ dữ liệu để kiểm tra tên';
    }

    return 'Khớp';
  })();

  useEffect(() => {
    if (!pendingQrUpload || !pendingQrComparison || pendingQrComparison.highestSeverity !== 'NONE') {
      return;
    }

    setForm((prev) => ({
      ...prev,
      qrImageUrl: pendingQrUpload.fileUrl,
      qrValidationToken: pendingQrUpload.qrValidationToken,
    }));
    setAttachedQrAnalysis(pendingQrUpload.qrAnalysis);
    setPendingQrUpload(null);
  }, [pendingQrComparison, pendingQrUpload]);

  const clearAutofillHighlight = (...fields: AutofillField[]) => {
    if (fields.length === 0) {
      setAutofilledFields([]);
      return;
    }

    setAutofilledFields((prev) => prev.filter((field) => !fields.includes(field)));
  };

  const resolveBankFormValuesFromQr = (analysis: BankQrAnalysis, options: VietnamBankOption[]) => {
    const matchedBank = findVietnamBankOptionByCodeInList(options, analysis.bankCode);
    return {
      bankName: matchedBank ? getVietnamBankDisplayLabel(matchedBank) : analysis.providerName || '',
      bankCode: matchedBank?.code ?? analysis.bankCode ?? '',
    };
  };

  const buildQrDrivenForm = (
    currentForm: BankAccountFormState,
    analysis: BankQrAnalysis,
    options: VietnamBankOption[],
    mode: 'empty-only' | 'prefer-qr',
  ) => {
    const nextForm = { ...currentForm };
    const nextAutofilledFields: AutofillField[] = [];

    if (analysis.destinationType !== 'BANK') {
      return { nextForm, nextAutofilledFields };
    }

    const qrBankValues = resolveBankFormValuesFromQr(analysis, options);

    if ((mode === 'prefer-qr' || !currentForm.bankName.trim()) && qrBankValues.bankName) {
      nextForm.bankName = qrBankValues.bankName;
      nextAutofilledFields.push('bankName');
    }

    if ((mode === 'prefer-qr' || !normalizeBankCode(currentForm.bankCode)) && qrBankValues.bankCode) {
      nextForm.bankCode = qrBankValues.bankCode;
      nextAutofilledFields.push('bankCode');
    }

    if ((mode === 'prefer-qr' || !normalizeAccountNumber(currentForm.accountNumber)) && analysis.accountNumber) {
      nextForm.accountNumber = analysis.accountNumber;
      nextAutofilledFields.push('accountNumber');
    }

    if ((mode === 'prefer-qr' || !normalizeAccountHolder(currentForm.accountHolder)) && analysis.accountHolder) {
      nextForm.accountHolder = analysis.accountHolder;
      nextAutofilledFields.push('accountHolder');
    }

    return { nextForm, nextAutofilledFields };
  };

  const getInputStateClassName = (field: AutofillField, hasError?: string) => {
    if (hasError) {
      return errorInputBorderClassName;
    }

    return autofilledFields.includes(field)
      ? autofillInputBorderClassName
      : defaultInputBorderClassName;
  };

  const clearFieldError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const updateFormValue = (field: keyof BankAccountFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
    if (field === 'bankName' || field === 'bankCode' || field === 'accountNumber' || field === 'accountHolder') {
      clearAutofillHighlight(field);
    }
    setFormError('');
  };

  const applyMatchedBank = (value: string, options: VietnamBankOption[]) => {
    const matchedBank = findVietnamBankOptionInList(options, value);
    return {
      bankName: matchedBank ? getVietnamBankDisplayLabel(matchedBank) : value,
      bankCode: matchedBank?.code ?? '',
    };
  };

  const ensureBankOptionsLoaded = async () => {
    if (bankOptions.length > 0) {
      return bankOptions;
    }

    setLoadingBankOptions(true);
    try {
      const options = await loadVietnamBankOptions();
      setBankOptions(options);
      return options;
    } finally {
      setLoadingBankOptions(false);
    }
  };

  const handleBankNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      bankName: value,
      bankCode: '',
    }));
    clearFieldError('bankName');
    clearFieldError('bankCode');
    clearAutofillHighlight('bankName', 'bankCode');
    setFormError('');
    setShowBankSuggestions(true);

    const syncSelection = (options: VietnamBankOption[]) => {
      setForm((prev) => {
        if (prev.bankName !== value) {
          return prev;
        }

        const next = applyMatchedBank(value, options);
        if (prev.bankName === next.bankName && prev.bankCode === next.bankCode) {
          return prev;
        }

        return {
          ...prev,
          bankName: next.bankName,
          bankCode: next.bankCode,
        };
      });
    };

    if (bankOptions.length > 0) {
      syncSelection(bankOptions);
      return;
    }

    if (value.trim().length > 0) {
      void ensureBankOptionsLoaded().then(syncSelection).catch(() => undefined);
    }
  };

  const selectBankOption = (bank: VietnamBankOption) => {
    setForm((prev) => ({
      ...prev,
      bankName: getVietnamBankDisplayLabel(bank),
      bankCode: bank.code,
    }));
    clearFieldError('bankName');
    clearFieldError('bankCode');
    clearAutofillHighlight('bankName', 'bankCode');
    setFormError('');
    setShowBankSuggestions(false);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingAccount(null);
    setSaveReview(null);
    setForm(defaultFormState);
    setErrors({});
    setFormError('');
    setShowBankSuggestions(false);
    setAttachedQrAnalysis(null);
    setPendingQrUpload(null);
    setAutofilledFields([]);
  };

  const openCreateForm = () => {
    setEditingAccount(null);
    setSaveReview(null);
    setForm({
      ...defaultFormState,
      makeDefault: accounts.length === 0,
    });
    setErrors({});
    setFormError('');
    setShowForm(true);
    setAttachedQrAnalysis(null);
    setPendingQrUpload(null);
    setAutofilledFields([]);
  };

  const openEditForm = (account: BankAccount) => {
    setEditingAccount(account);
    setSaveReview(null);
    setForm({
      bankName: account.bankName,
      bankCode: account.bankCode ?? '',
      accountNumber: '',
      accountHolder: account.accountHolder,
      qrImageUrl: account.qrImageUrl ?? '',
      qrValidationToken: '',
      makeDefault: account.isDefault,
    });
    setErrors({});
    setFormError('');
    setShowForm(true);
    setAttachedQrAnalysis(null);
    setPendingQrUpload(null);
    setAutofilledFields([]);
  };

  const handleUploadQr = async (file?: File | null) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setFormError('Chỉ có thể tải lên tệp hình ảnh cho mã QR.');
      return;
    }

    try {
      setUploadingQr(true);
      setFormError('');
      const normalizedFile = await normalizeBankQrImage(file);
      const qrContent = await decodeBankQrContentFromFile(normalizedFile);
      let sourceFile = normalizedFile;
      try {
        const compressed = await compressImage(normalizedFile, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1600,
          initialQuality: 0.92,
          useWebWorker: true,
        });
        sourceFile = compressed.file;
      } catch {
        sourceFile = normalizedFile;
      }

      const imageData = await fileToBase64(sourceFile);
      const uploaded = await userService.uploadBankQrImage(imageData, sourceFile.name, qrContent);
      const sanitizedQrAnalysis = sanitizeBankQrAnalysis(uploaded.qrAnalysis);
      const resolvedBankOptions = sanitizedQrAnalysis.destinationType === 'BANK'
        ? (bankOptions.length > 0 ? bankOptions : await ensureBankOptionsLoaded())
        : bankOptions;
      const { nextForm, nextAutofilledFields } = buildQrDrivenForm(
        form,
        sanitizedQrAnalysis,
        resolvedBankOptions,
        'empty-only',
      );
      const comparison = compareBankFormWithQrAnalysis(nextForm, sanitizedQrAnalysis);

      setAutofilledFields(nextAutofilledFields);

      if (comparison.highestSeverity === 'NONE') {
        setForm({
          ...nextForm,
          qrImageUrl: uploaded.fileUrl,
          qrValidationToken: uploaded.qrValidationToken,
        });
        setAttachedQrAnalysis(sanitizedQrAnalysis);
        setPendingQrUpload(null);
        showToast({
          type: 'success',
          title: 'Đã nhận diện QR và cập nhật thông tin khả dụng.',
        });
        return;
      }

      setForm(nextForm);
      setAttachedQrAnalysis(null);
      setPendingQrUpload({
        ...uploaded,
        qrAnalysis: sanitizedQrAnalysis,
      });
    } catch (error) {
      setFormError(resolveBankQrUploadErrorMessage(error));
    } finally {
      setUploadingQr(false);
    }
  };

  const applyQrToForm = async (source: PendingQrUploadState | null, analysis: BankQrAnalysis | null) => {
    if (!analysis) {
      return;
    }

    const resolvedBankOptions = bankOptions.length > 0 ? bankOptions : await ensureBankOptionsLoaded();
    const { nextForm, nextAutofilledFields } = buildQrDrivenForm(form, analysis, resolvedBankOptions, 'prefer-qr');

    setForm({
      ...nextForm,
      qrImageUrl: source?.fileUrl ?? form.qrImageUrl,
      qrValidationToken: source?.qrValidationToken ?? form.qrValidationToken,
    });
    setAutofilledFields(nextAutofilledFields);
    setAttachedQrAnalysis(analysis);
    setPendingQrUpload(null);
    setFormError('');
  };

  const clearPendingQrUpload = () => {
    setForm((prev) => ({
      ...prev,
      qrImageUrl: '',
      qrValidationToken: '',
    }));
    setAttachedQrAnalysis(null);
    setPendingQrUpload(null);
    setAutofilledFields([]);
    setFormError('');
  };

  const clearAttachedQr = () => {
    setForm((prev) => ({
      ...prev,
      qrImageUrl: '',
      qrValidationToken: '',
    }));
    setAttachedQrAnalysis(null);
    setPendingQrUpload(null);
    setAutofilledFields([]);
    setFormError('');
  };

  const buildReviewPayload = async (): Promise<BankAccountSavePayload> => {
    const resolvedBankOptions = form.bankName.trim().length > 0
      ? await ensureBankOptionsLoaded()
      : bankOptions;
    const matchedBank = findVietnamBankOptionInList(resolvedBankOptions, form.bankName);
    const normalizedBankName = matchedBank ? getVietnamBankDisplayLabel(matchedBank) : form.bankName;
    const normalizedBankCode = matchedBank?.code ?? (form.bankCode || undefined);

    return {
      bankName: normalizedBankName,
      bankCode: normalizedBankCode,
      accountNumber: normalizeAccountNumber(form.accountNumber),
      accountHolder: normalizeAccountHolder(form.accountHolder),
      qrImageUrl: form.qrImageUrl || undefined,
      qrValidationToken: form.qrImageUrl ? (form.qrValidationToken || undefined) : undefined,
      inputMethod: form.qrImageUrl ? 'QR_IMAGE' : 'MANUAL',
    };
  };

  const submitSave = async (payload: BankAccountSavePayload, makeDefault: boolean) => {
    try {
      const validatedPayload = bankAccountClientSchema.parse(payload);
      setSaving(true);
      const saved = editingAccount
        ? await userService.updateBankAccount(editingAccount.bankAccountId, validatedPayload)
        : await userService.createBankAccount(validatedPayload);

      if (makeDefault && !saved.isDefault) {
        await userService.setDefaultBankAccount(saved.bankAccountId);
      }

      await loadAccounts();
      setSaveReview(null);
      resetForm();
      showToast({
        type: 'success',
        title: editingAccount ? 'Đã cập nhật tài khoản nhận hoàn.' : 'Đã thêm tài khoản nhận hoàn.',
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const mappedErrors = mapZodFieldErrors(error);
        setErrors(mappedErrors);
        setFormError(firstFieldError(mappedErrors) || 'Thông tin tài khoản chưa hợp lệ.');
        return;
      }

      const typedError = error as Error & { details?: Array<{ field?: string; message?: string }> };
      const detailErrors = Array.isArray(typedError.details)
        ? typedError.details.reduce<FieldErrorMap>((acc, issue) => {
            if (issue.field && issue.message && !acc[issue.field]) {
              acc[issue.field] = issue.message;
            }
            return acc;
          }, {})
        : {};

      if (Object.keys(detailErrors).length > 0) {
        setErrors(detailErrors);
      }

      setFormError(resolveBankQrSaveErrorMessage(typedError));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setErrors({});
      setFormError('');
      const payload = await buildReviewPayload();
      setSaveReview({
        payload,
        makeDefault: form.makeDefault,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const mappedErrors = mapZodFieldErrors(error);
        setErrors(mappedErrors);
        setFormError(firstFieldError(mappedErrors) || 'Thông tin tài khoản chưa hợp lệ.');
        return;
      }

      const typedError = error as Error & { details?: Array<{ field?: string; message?: string }> };
      const detailErrors = Array.isArray(typedError.details)
        ? typedError.details.reduce<FieldErrorMap>((acc, issue) => {
            if (issue.field && issue.message && !acc[issue.field]) {
              acc[issue.field] = issue.message;
            }
            return acc;
          }, {})
        : {};

      if (Object.keys(detailErrors).length > 0) {
        setErrors(detailErrors);
      }

      setFormError(resolveBankQrSaveErrorMessage(typedError));
    }
  };

  const handleDelete = async (bankAccountId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa tài khoản ngân hàng này không?')) {
      return;
    }

    try {
      await userService.deleteBankAccount(bankAccountId);
      await loadAccounts();
      showToast({
        type: 'success',
        title: 'Đã xóa tài khoản ngân hàng.',
      });
    } catch (error) {
      const typedError = error as Error | { message?: string };
      showToast({
        type: 'error',
        title: typedError.message || 'Không thể xóa tài khoản ngân hàng.',
      });
    }
  };

  const handleSetDefault = async (bankAccountId: number) => {
    try {
      await userService.setDefaultBankAccount(bankAccountId);
      await loadAccounts();
      showToast({
        type: 'success',
        title: 'Đã cập nhật tài khoản mặc định.',
      });
    } catch (error) {
      const typedError = error as Error | { message?: string };
      showToast({
        type: 'error',
        title: typedError.message || 'Không thể cập nhật tài khoản mặc định.',
      });
    }
  };

  const visibleBankSuggestions = filterVietnamBankOptionsInList(bankOptions, form.bankName);

  return (
    <section
      id={isActive ? 'profile-content' : undefined}
      aria-hidden={!isActive}
      className={`${surfaceClassName} overflow-hidden p-6 ${isActive ? '' : 'hidden'}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-black">Tài khoản</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-white/58">
            Quản lý thông tin tài khoản ngân hàng để tối ưu hóa và rút ngắn thời gian xử lý các giao dịch tài chính của bạn.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openCreateForm}
            className={`${subtleButtonClassName} inline-flex items-center gap-2 rounded px-4 py-3`}
          >
            <Plus size={14} />
            Thêm tài khoản
          </button>
        )}
      </div>

      {showForm && (
        <div className="mt-6 rounded-sm border border-white/10 bg-black/20 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-bold">
                {editingAccount ? 'Cập nhật tài khoản ngân hàng' : 'Thêm tài khoản ngân hàng mới'}
              </h3>
              {editingAccount && (
                <p className="mt-2 text-sm leading-6 text-white/58">
                  Vì hệ thống chỉ lưu số tài khoản đã được ẩn bớt, bạn cần nhập lại đầy đủ số tài khoản khi cập nhật.
                </p>
              )}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
              <QrCode size={12} />
              {pendingQrUpload ? 'QR cần xác nhận' : form.qrImageUrl ? 'Đã thêm QR' : 'QR tùy chọn'}
            </div>
          </div>

          {formError && <div className={`mt-4 ${formErrorClassName}`}>{formError}</div>}
          {qrReviewMessage && (
            <div
              className={`mt-4 rounded border px-4 py-3 text-sm ${
                activeQrComparison?.highestSeverity === 'BLOCKING'
                  ? 'border-red-500/30 bg-red-500/10 text-red-200'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
              }`}
            >
              {qrReviewMessage}
            </div>
          )}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="profile-bank-name" className={fieldLabelClassName}>Tên ngân hàng</label>
              <div className="relative">
                <input
                  id="profile-bank-name"
                  type="text"
                  value={form.bankName}
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-expanded={showBankSuggestions}
                  aria-controls="profile-bank-suggestion-list"
                  onFocus={() => {
                    setShowBankSuggestions(true);
                    void ensureBankOptionsLoaded();
                  }}
                  onBlur={() => {
                    window.setTimeout(() => {
                      setShowBankSuggestions(false);
                    }, 120);
                  }}
                  onChange={(event) => handleBankNameChange(event.target.value)}
                  className={`${inputClassName} pr-10 ${getInputStateClassName('bankName', errors.bankName)}`}
                  placeholder="Gõ để tìm ngân hàng"
                />
                <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/45" />

                {showBankSuggestions && (loadingBankOptions || visibleBankSuggestions.length > 0) && (
                  <div
                    id="profile-bank-suggestion-list"
                    className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded border border-white/10 bg-black/95 shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
                  >
                    {loadingBankOptions ? (
                      <div className="px-4 py-3 text-sm text-white/60">Đang tải danh sách ngân hàng...</div>
                    ) : (
                      <div
                        className="overflow-y-auto"
                        style={{ maxHeight: `${bankSuggestionViewportMaxHeightRem}rem` }}
                      >
                        {visibleBankSuggestions.map((bank) => (
                          <button
                            key={`${bank.code}-${bank.shortName}`}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              selectBankOption(bank);
                            }}
                            className="block w-full border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5 last:border-b-0"
                          >
                            <div className="text-sm font-semibold text-white">{getVietnamBankDisplayLabel(bank)}</div>
                            <div className="mt-1 text-xs leading-5 text-white/60">
                              {getVietnamBankDisplayLabel(bank)} - {bank.name} ({bank.code})
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {errors.bankName && <p className={fieldErrorClassName}>{errors.bankName}</p>}
            </div>

            <div>
              <label htmlFor="profile-bank-code" className={fieldLabelClassName}>Mã ngân hàng</label>
              <input
                id="profile-bank-code"
                type="text"
                value={form.bankCode}
                readOnly
                className={`${inputClassName} ${getInputStateClassName('bankCode', errors.bankCode)}`}
                placeholder="Tự động điền khi chọn ngân hàng"
              />
              {errors.bankCode && <p className={fieldErrorClassName}>{errors.bankCode}</p>}
            </div>

            <div>
              <label htmlFor="profile-account-number" className={fieldLabelClassName}>Số tài khoản</label>
              <input
                id="profile-account-number"
                type="text"
                value={form.accountNumber}
                onChange={(event) => updateFormValue('accountNumber', event.target.value)}
                className={`${inputClassName} ${getInputStateClassName('accountNumber', errors.accountNumber)}`}
                placeholder={editingAccount ? `Nhập lại số tài khoản (${editingAccount.accountNumberMasked})` : 'Nhập số tài khoản'}
              />
              {errors.accountNumber && <p className={fieldErrorClassName}>{errors.accountNumber}</p>}
            </div>

            <div>
              <label htmlFor="profile-account-holder" className={fieldLabelClassName}>Chủ tài khoản</label>
              <input
                id="profile-account-holder"
                type="text"
                value={form.accountHolder}
                onChange={(event) => updateFormValue('accountHolder', normalizeAccountHolderInput(event.target.value))}
                className={`${inputClassName} ${getInputStateClassName('accountHolder', errors.accountHolder)}`}
                placeholder="VD: NGUYEN VAN A"
              />
              {errors.accountHolder && <p className={fieldErrorClassName}>{errors.accountHolder}</p>}
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="rounded-sm border border-white/10 bg-black/25 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">Ảnh QR ngân hàng</div>
                  <p className="mt-2 text-sm leading-6 text-white/58">
                    Vui lòng kiểm tra lại thông tin và ảnh trước khi xác nhận.
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/75 transition hover:border-white/20 hover:bg-white/10 hover:text-white">
                  <QrCode size={14} />
                  {uploadingQr ? 'Đang tải...' : 'Tải QR'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      void handleUploadQr(event.target.files?.[0] ?? null);
                      event.target.value = '';
                    }}
                  />
                </label>
              </div>
              {displayedQrAnalysis && (
                <div className="mt-4 rounded border border-white/10 bg-black/25 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-semibold text-white">
                      {displayedQrAnalysis.destinationType === 'BANK'
                        ? 'Đã nhận diện QR ngân hàng'
                        : displayedQrAnalysis.destinationType === 'WALLET'
                          ? 'Đã nhận diện QR ví điện tử'
                          : 'Đã nhận diện QR nhưng chưa xác định được loại'}
                    </div>
                    <div
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                        qrSummaryStatusLabel === 'Khớp'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                          : qrSummaryStatusLabel === 'Không đủ dữ liệu để kiểm tra tên'
                            ? 'border-blue-500/30 bg-blue-500/10 text-blue-200'
                            : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                      }`}
                    >
                      {qrSummaryStatusLabel}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded border border-white/10 bg-white/[0.03] px-3 py-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">Loại QR</div>
                      <div className="mt-2 text-sm text-white/85">{getQrDestinationLabel(displayedQrAnalysis)}</div>
                    </div>
                    <div className="rounded border border-white/10 bg-white/[0.03] px-3 py-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">
                        {displayedQrAnalysis.destinationType === 'WALLET' ? 'Ví điện tử' : 'Ngân hàng'}
                      </div>
                      <div className="mt-2 text-sm text-white/85">
                        {displayedQrAnalysis.providerName || displayedQrAnalysis.walletProvider || 'Không có dữ liệu'}
                      </div>
                    </div>
                    <div className="rounded border border-white/10 bg-white/[0.03] px-3 py-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">Số tài khoản</div>
                      <div className="mt-2 text-sm text-white/85">{maskAccountNumberForDisplay(displayedQrAnalysis.accountNumber)}</div>
                    </div>
                    <div className="rounded border border-white/10 bg-white/[0.03] px-3 py-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">Chủ tài khoản</div>
                      <div className="mt-2 text-sm text-white/85">{displayedQrAnalysis.accountHolder || 'Không có dữ liệu trong QR'}</div>
                    </div>
                  </div>
                </div>
              )}
              {qrMissingAccountHolderMessage && (
                <div className="mt-3 rounded border border-white/10 bg-white/5 px-3 py-2 text-xs leading-6 text-white/60">
                  {qrMissingAccountHolderMessage}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-sm border border-white/10 bg-black/25">
              {displayedQrImageUrl ? (
                <img
                  src={getCloudinaryQrImage(displayedQrImageUrl, 900, 900)}
                  alt="QR ngân hàng"
                  data-testid="bank-qr-form-preview"
                  className="h-full min-h-48 w-full object-contain bg-white/[0.03] p-3"
                />
              ) : (
                <div
                  data-testid="bank-qr-form-empty"
                  className="flex h-full min-h-48 items-center justify-center px-5 text-center text-sm text-white/45"
                >
                  Chưa có ảnh QR nào được tải lên.
                </div>
              )}
            </div>
          </div>

          {activeQrComparison && activeQrAnalysis && (
            <div className="mt-4 flex flex-wrap gap-3">
              {activeQrComparison.highestSeverity !== 'BLOCKING' && (
                <button
                  type="button"
                  onClick={() => void applyQrToForm(pendingQrUpload, activeQrAnalysis)}
                  className={`${solidPrimaryButtonClassName} rounded px-4 py-2`}
                >
                  Dùng dữ liệu từ QR
                </button>
              )}
              {activeQrReviewSource === 'pending' ? (
                <button
                  type="button"
                  onClick={clearPendingQrUpload}
                  className={`${subtleButtonClassName} rounded px-4 py-2`}
                >
                  Giữ dữ liệu đã nhập
                </button>
              ) : (
                <button
                  type="button"
                  onClick={clearAttachedQr}
                  className={`${subtleButtonClassName} rounded px-4 py-2`}
                >
                  Bỏ QR hiện tại
                </button>
              )}
            </div>
          )}

          <label className="mt-5 flex items-start gap-3 rounded border border-white/10 bg-bg-dark px-4 py-4 text-sm text-white/75">
            <input
              type="checkbox"
              checked={form.makeDefault}
              onChange={(event) => updateFormValue('makeDefault', event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary"
            />
            <span>
              <span className="block font-semibold text-white">Đặt làm tài khoản mặc định</span>
              <span className="mt-1 block text-xs leading-6 text-white/55">
                Tài khoản mặc định sẽ được ưu tiên cho các yêu cầu hoàn tiền mới.
              </span>
            </span>
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={handleSave} disabled={isSaveDisabled} className={`${solidPrimaryButtonClassName} rounded px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60`}>
              {saving ? 'Đang lưu...' : editingAccount ? 'Lưu cập nhật' : 'Thêm tài khoản'}
            </button>
            <button onClick={resetForm} className={`${subtleButtonClassName} rounded px-5 py-3`}>
              Hủy
            </button>
          </div>
        </div>
      )}

      {saveReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="w-full max-w-2xl rounded-sm border border-white/10 bg-[#111111] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {editingAccount ? 'Xác nhận cập nhật tài khoản' : 'Xác nhận thêm tài khoản'}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/58">
                  Vui lòng kiểm tra lại thông tin trước khi xác nhận lưu tài khoản ngân hàng.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
                <QrCode size={12} />
                {saveReview.payload.inputMethod === 'QR_IMAGE' ? 'Có QR' : 'Nhập tay'}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">Tên ngân hàng</div>
                <div className="mt-2 text-sm text-white/90">{saveReview.payload.bankName}</div>
              </div>
              <div className="rounded border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">Mã ngân hàng</div>
                <div className="mt-2 text-sm text-white/90">{saveReview.payload.bankCode || 'Không có dữ liệu'}</div>
              </div>
              <div className="rounded border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">Số tài khoản</div>
                <div className="mt-2 text-sm text-white/90">{saveReview.payload.accountNumber}</div>
              </div>
              <div className="rounded border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">Chủ tài khoản</div>
                <div className="mt-2 text-sm text-white/90">{saveReview.payload.accountHolder || 'Không có dữ liệu'}</div>
              </div>
            </div>

            <div className="mt-4 rounded border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white/65">
              <div>Phương thức nhập: {saveReview.payload.inputMethod === 'QR_IMAGE' ? 'Có ảnh QR ngân hàng' : 'Nhập tay'}</div>
              <div>Đặt làm mặc định: {saveReview.makeDefault ? 'Có' : 'Không'}</div>
            </div>

            {saveReviewValidationMessage && (
              <div className="mt-4 rounded border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
                {saveReviewValidationMessage}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setSaveReview(null)}
                className={`${subtleButtonClassName} rounded px-5 py-3`}
              >
                Quay lại chỉnh sửa
              </button>
              <button
                type="button"
                onClick={() => void submitSave(saveReview.payload, saveReview.makeDefault)}
                disabled={saving || Boolean(saveReviewValidationMessage)}
                className={`${solidPrimaryButtonClassName} rounded px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {saving ? 'Đang lưu...' : editingAccount ? 'Xác nhận cập nhật' : 'Xác nhận thêm tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {loading ? (
          <LoadingAccountCards />
        ) : accounts.length === 0 ? (
          <div className={`${elevatedCardClassName} p-8 text-center`}>
            <Landmark size={26} className="mx-auto text-white/45" />
            <h3 className="mt-4 text-xl font-bold">Chưa có tài khoản nhận hoàn tiền</h3>
            <p className="mt-2 text-sm leading-7 text-white/58">
              Thêm tài khoản ngân hàng để đảm bảo các quyền lợi tài chính và yêu cầu hoàn tiền của bạn được xử lý nhanh hơn.
            </p>
            {!showForm && (
              <button onClick={openCreateForm} className={`mt-5 ${solidPrimaryButtonClassName} rounded px-5 py-3`}>
                Tạo tài khoản đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {accounts.map((account) => (
              <div key={account.bankAccountId} className={`${elevatedCardClassName} overflow-hidden`}>
                <div className="flex h-full flex-col gap-5 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{account.bankName}</h3>
                        {account.bankCode && (
                          <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">
                            {account.bankCode}
                          </span>
                        )}
                        {account.isDefault && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                            <Star size={11} />
                            Mặc định
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-medium text-white/82">{account.accountHolder}</p>
                      <p className="mt-1 text-sm text-white/58">{account.accountNumberMasked}</p>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
                      <QrCode size={11} />
                      {account.inputMethod === 'QR_IMAGE' ? 'QR' : 'Nhập tay'}
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_7rem]">
                    <div className="rounded-sm border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/62">
                      <div>Cập nhật lần cuối: {formatDateTime(account.updatedAt)}</div>
                      <div>Trạng thái: {account.isActive ? 'Đang sử dụng' : 'Tạm ẩn'}</div>
                    </div>
                    <div className="overflow-hidden rounded-sm border border-white/10 bg-black/20">
                      {account.qrImageUrl ? (
                        <img
                          src={getCloudinaryQrImage(account.qrImageUrl, 420, 420)}
                          alt="QR ngân hàng đã lưu"
                          className="h-full min-h-28 w-full object-contain bg-white/[0.03] p-2"
                        />
                      ) : (
                        <div className="flex h-full min-h-28 items-center justify-center px-3 text-center text-xs text-white/42">
                          Chưa có QR
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => openEditForm(account)} className={`${subtleButtonClassName} inline-flex items-center gap-2 rounded px-4 py-2 text-[11px]`}>
                      <Pencil size={13} />
                      Chỉnh sửa
                    </button>
                    {!account.isDefault && (
                      <button onClick={() => void handleSetDefault(account.bankAccountId)} className={`${subtleButtonClassName} rounded px-4 py-2 text-[11px]`}>
                        Đặt mặc định
                      </button>
                    )}
                    <button onClick={() => void handleDelete(account.bankAccountId)} className="inline-flex items-center gap-2 rounded border border-red-500/20 bg-red-500/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-red-300 transition-colors hover:border-red-500/40 hover:text-red-200">
                      <Trash2 size={13} />
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
