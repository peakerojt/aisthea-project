import React, { useEffect, useRef, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Camera,
  ChevronDown,
  ChevronUp,
  Clock3,
  CircleCheckBig,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Upload,
  WalletCards,
  X,
} from 'lucide-react';
import {
  ReturnCustomerWriteError,
  returnCustomerWriteService,
} from '@/common/services/return.customer-write.service';
import { returnOrderReadService } from '@/common/services/return.order-read.service';
import type { CreateReturnPayload, ReturnReason } from '@/common/services/return.types';
import { orderService, type OrderDetail } from '@/common/services/order.service';
import { dispatchReturnSummaryChanged } from '@/common/events/returnSummary.events';
import { useAuth } from '@/common/contexts/AuthContext';
import { compressImage, isValidImageType } from '@/common/utils/imageCompression';
import { refundUi } from '@/common/styles/refundUi';
import { useTranslation } from 'react-i18next';

type ReturnTranslator = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>,
) => string;

const createReturnSchema = (t: ReturnTranslator) =>
  z.object({
    orderId: z.number().int().positive(),
    reason: z.enum(['DEFECTIVE', 'WRONG_ITEM', 'SIZE_ISSUE', 'CHANGED_MIND', 'OTHER']),
    note: z.string().max(500).optional(),
    items: z.array(
      z.object({
        orderItemId: z.number().int().positive(),
        quantity: z.number().int().min(1, t('create.quantityMin', 'Số lượng tối thiểu là 1')),
        reason: z.string().optional(),
        reasonText: z.string().max(200).optional(),
        attachments: z
          .array(z.string().url(t('create.attachmentInvalidUrl', 'URL ảnh không hợp lệ')))
          .optional(),
        selected: z.boolean(),
        maxQuantity: z.number().optional(),
      }),
    ),
    attachments: z
      .array(z.string().url(t('create.attachmentInvalidUrl', 'URL ảnh không hợp lệ')))
      .max(5)
      .optional(),
  });

type FormData = z.infer<ReturnType<typeof createReturnSchema>>;
type ReturnableOrder = Pick<OrderDetail, 'orderId' | 'orderNumber' | 'status' | 'items'>;

const REASON_KEYS = ['DEFECTIVE', 'WRONG_ITEM', 'SIZE_ISSUE', 'CHANGED_MIND', 'OTHER'] as const;
const MAX_ATTACHMENTS_PER_REQUEST = 5;
const MAX_ATTACHMENT_FILE_SIZE = 5 * 1024 * 1024;

type UploadScope = 'request' | 'item';
type UploadStatus = 'compressing' | 'uploading' | 'uploaded' | 'error';

interface UploadAsset {
  id: string;
  file: File;
  fileName: string;
  previewUrl: string;
  progress: number;
  status: UploadStatus;
  scope: UploadScope;
  itemIndex?: number;
  uploadedUrl?: string;
  error?: string;
}

interface Props {
  orderIdForReturn: number;
  onSuccess?: (returnId?: number) => void;
  onExistingReturn?: (returnId: number) => void;
  onBackToOrders?: () => void;
}

function Toast({ msg, type }: { msg: string; type: 'error' | 'success' }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${type === 'error'
        ? 'border-red-500/25 bg-red-500/10 text-red-200'
        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
        }`}
    >
      <span className="mt-0.5 shrink-0">
        {type === 'error' ? <AlertTriangle size={18} /> : <CircleCheckBig size={18} />}
      </span>
      <p className="text-sm leading-6">{msg}</p>
    </div>
  );
}

const createUploadId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function UploadThumbnail({
  asset,
  alt,
  removeLabel,
  replaceLabel,
  replaceInputLabel,
  retryLabel,
  onRemove,
  onReplace,
  onRetry,
}: {
  asset: UploadAsset;
  alt: string;
  removeLabel: string;
  replaceLabel: string;
  replaceInputLabel: string;
  retryLabel: string;
  onRemove: (id: string) => void;
  onReplace: (id: string, file: File) => void;
  onRetry: (id: string) => void;
}) {
  const isBusy = asset.status === 'compressing' || asset.status === 'uploading';
  const replaceInputId = `replace-upload-${asset.id}`;
  const statusLabel =
    asset.status === 'compressing'
      ? 'Đang tối ưu'
      : asset.status === 'uploading'
        ? 'Đang tải'
        : asset.status === 'uploaded'
          ? 'Đã tải'
          : 'Lỗi tải';
  const statusClasses =
    asset.status === 'uploaded'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
      : asset.status === 'error'
        ? 'border-red-500/20 bg-red-500/10 text-red-200'
        : 'border-sky-500/20 bg-sky-500/10 text-sky-200';

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white/[0.03] ${asset.status === 'error'
        ? 'border-red-500/40'
        : asset.status === 'uploaded'
          ? 'border-emerald-500/25'
          : 'border-white/10'
        }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-black/20">
        <img src={asset.previewUrl} alt={alt} className="h-full w-full object-cover" />

        {isBusy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/65 px-3 text-center">
            <Loader2 size={18} className="animate-spin text-white" />
            <p className="text-xs text-white/80">
              {asset.status === 'compressing' ? 'Đang tối ưu ảnh...' : 'Đang tải ảnh...'}
            </p>
            <div className="h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-sky-500 transition-[width] duration-200"
                style={{ width: `${Math.max(asset.progress, 10)}%` }}
              />
            </div>
          </div>
        )}

        {asset.status === 'error' && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-3 pt-8">
            <p className="text-xs font-medium text-red-300">{asset.error}</p>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-white/10 bg-black/20 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-xs leading-5 text-white/80">{asset.fileName}</p>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusClasses}`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {asset.status === 'error' && (
            <button
              type="button"
              onClick={() => onRetry(asset.id)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] text-white hover:bg-white/15 transition-colors"
            >
              <RefreshCw size={12} />
              {retryLabel}
            </button>
          )}

          {!isBusy && (
            <label
              htmlFor={replaceInputId}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] text-white hover:bg-white/15 transition-colors"
            >
              <RotateCcw size={12} />
              {replaceLabel}
            </label>
          )}

          <button
            type="button"
            onClick={() => onRemove(asset.id)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-200 hover:bg-red-500/20 transition-colors"
          >
            <X size={12} />
            {removeLabel}
          </button>
        </div>
      </div>

      <input
        id={replaceInputId}
        aria-label={replaceInputLabel}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const nextFile = event.target.files?.[0];
          if (nextFile) {
            onReplace(asset.id, nextFile);
          }
          event.currentTarget.value = '';
        }}
      />
    </div>
  );
}

function EvidenceUploader({
  inputId,
  inputLabel,
  title,
  description,
  rules,
  mobileActionLabel,
  desktopActionLabel,
  assets,
  disabled,
  compact = false,
  renderAlt,
  onFilesSelected,
  onRemove,
  onReplace,
  onRetry,
  removeLabel,
  replaceLabel,
  replaceInputLabel,
  retryLabel,
}: {
  inputId: string;
  inputLabel: string;
  title: string;
  description: string;
  rules: string;
  mobileActionLabel: string;
  desktopActionLabel: string;
  assets: UploadAsset[];
  disabled: boolean;
  compact?: boolean;
  renderAlt: (index: number) => string;
  onFilesSelected: (files: File[]) => void;
  onRemove: (id: string) => void;
  onReplace: (id: string, file: File) => void;
  onRetry: (id: string) => void;
  removeLabel: string;
  replaceLabel: string;
  replaceInputLabel: string;
  retryLabel: string;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    onFilesSelected(Array.from(files));
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (disabled) return;
          handleFiles(event.dataTransfer.files);
        }}
        className={`rounded-xl border border-dashed transition-colors ${compact ? 'p-3' : 'p-4'} ${disabled
          ? 'border-white/10 bg-white/[0.03] opacity-70'
          : isDragging
            ? 'border-sky-400/70 bg-sky-400/[0.08]'
            : 'border-white/15 bg-black/10 hover:border-white/30 hover:bg-white/[0.04]'
          }`}
      >
        <input
          id={inputId}
          aria-label={inputLabel}
          type="file"
          accept="image/*"
          multiple
          disabled={disabled}
          className="sr-only"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.currentTarget.value = '';
          }}
        />

        <label
          htmlFor={inputId}
          className={`flex ${compact ? 'items-center gap-3' : 'min-h-[138px] flex-col items-center justify-center gap-2 text-center'} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className={`flex shrink-0 items-center justify-center rounded-full ${compact ? 'h-10 w-10' : 'h-11 w-11'} bg-white/8 text-sky-200`}>
            {compact ? <ImagePlus size={18} /> : <Upload size={20} />}
          </div>

          <div className={compact ? 'flex-1 text-left' : ''}>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="mt-1 text-xs leading-5 text-white/60">{description}</p>
            <p className="mt-1 text-[10px] tracking-[0.02em] text-white/40">{rules}</p>
          </div>

          <div className={`inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors ${disabled ? '' : 'hover:bg-white/15'}`}>
            <Camera size={14} className="sm:hidden" />
            <Upload size={14} className="hidden sm:block" />
            <span className="sm:hidden">{mobileActionLabel}</span>
            <span className="hidden sm:inline">{desktopActionLabel}</span>
          </div>
        </label>
      </div>

      {assets.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {assets.map((asset, index) => (
            <UploadThumbnail
              key={asset.id}
              asset={asset}
              alt={renderAlt(index + 1)}
              removeLabel={removeLabel}
              replaceLabel={replaceLabel}
              replaceInputLabel={replaceInputLabel}
              retryLabel={retryLabel}
              onRemove={onRemove}
              onReplace={onReplace}
              onRetry={onRetry}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const CreateReturnRequest: React.FC<Props> = ({
  orderIdForReturn,
  onSuccess,
  onExistingReturn,
  onBackToOrders,
}) => {
  const { t } = useTranslation('returns');
  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const value = t(key, { ...options, defaultValue: fallback });
    return value === key ? interpolateFallback(fallback, options) : value;
  };
  const reasonFallbacks: Record<(typeof REASON_KEYS)[number], string> = {
    DEFECTIVE: 'Sản phẩm lỗi',
    WRONG_ITEM: 'Giao sai hàng',
    SIZE_ISSUE: 'Sai kích cỡ / Không vừa',
    CHANGED_MIND: 'Đổi ý / Không còn nhu cầu',
    OTHER: 'Lý do khác',
  };

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const formSchema = createReturnSchema(resolveText);
  const uploadAssetsRef = useRef<UploadAsset[]>([]);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState('');
  const [uploadAssets, setUploadAssets] = useState<UploadAsset[]>([]);
  const [expandedItemIndexes, setExpandedItemIndexes] = useState<number[]>([]);

  const updateUploadAssets = (updater: (current: UploadAsset[]) => UploadAsset[]) => {
    setUploadAssets((current) => {
      const next = updater(current);
      uploadAssetsRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    return () => {
      uploadAssetsRef.current.forEach((asset) => {
        URL.revokeObjectURL(asset.previewUrl);
      });
    };
  }, []);

  const unknownErrorLabel = resolveText('create.unknownError', 'Lỗi không xác định');
  const selectItemErrorLabel = resolveText('create.selectItemError', 'Chọn ít nhất 1 sản phẩm để trả');
  const loginRequiredLabel = resolveText('create.loginRequired', 'Vui lòng đăng nhập.');
  const loadingOrderLabel = resolveText('create.loadingOrder', 'Đang tải đơn hàng...');
  const orderNotFoundLabel = resolveText('create.orderNotFound', 'Không tìm thấy đơn hàng.');
  const returnExistsLabel = resolveText(
    'create.returnExists',
    'Đơn hàng này đã có yêu cầu trả hàng đang mở. Đang chuyển tới chi tiết yêu cầu...',
  );
  const titleLabel = resolveText('create.title', 'Yêu cầu trả hàng');
  const backLabel = resolveText('create.back', 'Quay lại');
  const reasonLabel = resolveText('create.reasonLabel', 'Lý do trả hàng');
  const reasonHintLabel = resolveText(
    'create.reasonHint',
    'Bạn có thể thêm chi tiết riêng cho từng sản phẩm ở bên dưới.',
  );
  const itemReasonLabel = resolveText('create.itemReasonLabel', 'Lý do riêng');
  const itemReasonHintLabel = resolveText(
    'create.itemReasonHint',
    'Để trống nếu dùng lý do chung.',
  );
  const itemReasonInheritLabel = resolveText('create.itemReasonInherit', 'Dùng lý do chung');
  const itemReasonTextLabel = resolveText('create.itemReasonTextLabel', 'Chi tiết thêm');
  const itemReasonTextPlaceholder = resolveText(
    'create.itemReasonTextPlaceholder',
    'Ví dụ: bị xước ở mặt trước, thiếu phụ kiện, sai màu...',
  );
  const itemsLabel = resolveText('create.itemsLabel', 'Chọn sản phẩm trả');
  const noteLabel = resolveText('create.noteLabel', 'Ghi chú (tùy chọn)');
  const notePlaceholderLabel = resolveText('create.notePlaceholder', 'Mô tả vấn đề chi tiết...');
  const commonDetailsLabel = resolveText('create.commonDetailsLabel', 'Ghi chú chung');
  const commonDetailsHintLabel = resolveText(
    'create.commonDetailsHint',
    'Áp dụng cho toàn bộ yêu cầu trả hàng.',
  );
  const attachmentsLabel = resolveText('create.attachmentsLabel', 'Ảnh minh chứng');
  const attachmentsHintLabel = resolveText(
    'create.attachmentsHint',
    'Chụp rõ lỗi sản phẩm, tem mác hoặc tình trạng gói hàng nếu có.',
  );
  const attachmentsCounterLabel = resolveText('create.attachmentsCounter', '{{count}}/{{max}} ảnh', {
    count: uploadAssets.length,
    max: MAX_ATTACHMENTS_PER_REQUEST,
  });
  const attachmentsRulesLabel = resolveText(
    'create.attachmentsRules',
    'JPG, PNG, WebP, GIF • tối đa 5 ảnh',
  );
  const attachmentsDropzoneTitle = resolveText(
    'create.attachmentsDropzoneTitle',
    'Kéo thả ảnh vào đây hoặc chọn từ thiết bị',
  );
  const attachmentsDropzoneMobileLabel = resolveText(
    'create.attachmentsDropzoneMobile',
    'Chụp hoặc chọn ảnh',
  );
  const attachmentsDropzoneDesktopLabel = resolveText(
    'create.attachmentsDropzoneDesktop',
    'Kéo thả ảnh vào đây hoặc chọn từ thiết bị',
  );
  const itemAttachmentsLabel = resolveText('create.itemAttachmentsLabel', 'Ảnh riêng của sản phẩm');
  const itemAttachmentsHintLabel = resolveText(
    'create.itemAttachmentsHint',
    'Thêm ảnh riêng nếu sản phẩm này có lỗi hoặc tình trạng khác với phần còn lại.',
  );
  const itemAttachmentsDropzoneTitle = resolveText(
    'create.itemAttachmentsDropzoneTitle',
    'Thêm ảnh cho sản phẩm này',
  );
  const itemAttachmentsDropzoneDesktopLabel = resolveText(
    'create.itemAttachmentsDropzoneDesktop',
    'Chọn ảnh cho sản phẩm',
  );
  const removeAttachmentLabel = resolveText('create.removeAttachment', 'Xóa');
  const replaceAttachmentLabel = resolveText('create.replaceAttachment', 'Thay ảnh');
  const retryAttachmentLabel = resolveText('create.retryAttachment', 'Thử lại');
  const selectAttachmentInputLabel = resolveText('create.attachmentInputLabel', 'Chọn ảnh minh chứng');
  const replaceAttachmentInputLabel = resolveText('create.replaceAttachmentInputLabel', 'Thay ảnh minh chứng');
  const itemAttachmentInputLabel = (id: number) =>
    resolveText('create.itemAttachmentInputLabel', 'Chọn ảnh cho sản phẩm #{{id}}', { id });
  const replaceItemAttachmentInputLabel = (id: number) =>
    resolveText('create.replaceItemAttachmentInputLabel', 'Thay ảnh cho sản phẩm #{{id}}', { id });
  const attachmentInvalidTypeLabel = resolveText(
    'create.attachmentInvalidType',
    'Chỉ chấp nhận ảnh JPG, PNG, WebP hoặc GIF.',
  );
  const attachmentFileTooLargeLabel = resolveText(
    'create.attachmentFileTooLarge',
    'Mỗi ảnh tối đa 5MB.',
  );
  const attachmentsLimitReachedLabel = resolveText(
    'create.attachmentsLimitReached',
    'Bạn chỉ có thể tải lên tối đa 5 ảnh.',
  );
  const attachmentUploadFailedLabel = resolveText(
    'create.attachmentUploadFailed',
    'Tải ảnh thất bại. Vui lòng thử lại.',
  );
  const attachmentsUploadingLabel = resolveText(
    'create.attachmentsUploading',
    'Đang tải ảnh minh chứng...',
  );
  const attachmentsResolveErrorsLabel = resolveText(
    'create.attachmentsResolveErrors',
    'Có ảnh tải lên chưa thành công. Vui lòng thử lại hoặc xóa trước khi gửi yêu cầu.',
  );
  const itemDetailsToggleLabel = resolveText(
    'create.itemDetailsToggleLabel',
    'Thêm chi tiết cho sản phẩm này',
  );
  const submitLabel = resolveText('create.submit', 'Gửi yêu cầu');
  const submittingLabel = resolveText('create.submitting', 'Đang gửi...');
  const cancelLabel = resolveText('create.cancel', 'Hủy');
  const quantityShortLabel = resolveText('create.quantityShort', 'SL:');
  const mobileSubmitLabel = resolveText('create.mobileSubmitLabel', 'Gửi yêu cầu nhanh');
  const returnPolicyTitleLabel = resolveText('create.returnPolicyTitle', 'Chính sách trả hàng');
  const returnPolicyValueLabel = resolveText(
    'create.returnPolicyValue',
    'Áp dụng theo điều kiện đổi trả hiện hành của AISTHEA',
  );
  const processingEtaTitleLabel = resolveText('create.processingEtaTitle', 'Thời gian xử lý dự kiến');
  const processingEtaValueLabel = resolveText('create.processingEtaValue', '1-3 ngày làm việc sau khi nhận đủ thông tin');
  const refundMethodTitleLabel = resolveText('create.refundMethodTitle', 'Hoàn tiền');
  const refundMethodValueLabel = resolveText(
    'create.refundMethodValue',
    'Hoàn tiền theo phương thức gốc nếu đủ điều kiện',
  );
  const selectedProductsSummaryLabel = (count: number) =>
    resolveText('create.selectedProductsSummary', '{{count}} sản phẩm được chọn', { count });
  const summaryTitleLabel = resolveText('create.summaryTitle', 'Tóm tắt yêu cầu');
  const summaryHintLabel = resolveText(
    'create.summaryHint',
    'Kiểm tra nhanh thông tin trước khi gửi yêu cầu trả hàng.',
  );
  const summaryReasonLabel = resolveText('create.summaryReasonLabel', 'Lý do');
  const summaryProductsLabel = resolveText('create.summaryProductsLabel', 'Sản phẩm đã chọn');
  const summaryTotalQuantityLabel = resolveText('create.summaryTotalQuantityLabel', 'Tổng số lượng trả');
  const summaryAttachmentsLabel = resolveText('create.summaryAttachmentsLabel', 'Ảnh đính kèm');
  const summaryNoteLabel = resolveText('create.summaryNoteLabel', 'Ghi chú');
  const summaryNoNoteLabel = resolveText('create.summaryNoNoteLabel', 'Chưa có');
  const summaryMoreItemsLabel = (count: number) =>
    resolveText('create.summaryMoreItemsLabel', '+{{count}} sản phẩm khác', { count });
  const mobileSubmitSummaryLabel = (productCount: number, quantity: number) =>
    resolveText('create.mobileSubmitSummary', '{{products}} sản phẩm • {{quantity}} món', {
      products: productCount,
      quantity,
    });
  const headerSubtitle = (orderNumber: string | number, status: string) =>
    resolveText('create.headerSubtitle', 'Đơn #{{orderNumber}} · {{status}}', {
      orderNumber,
      status,
    });
  const itemFallbackLabel = (id: number) => resolveText('create.itemFallback', 'Sản phẩm #{{id}}', { id });
  const purchasedQuantityLabel = (quantity: number) =>
    resolveText('create.purchasedQuantity', 'Đã mua: {{quantity}}', { quantity });
  const itemAttachmentAltLabel = (itemId: number, index: number) =>
    resolveText('create.itemAttachmentAlt', 'Ảnh minh chứng sản phẩm #{{id}} - {{index}}', { id: itemId, index });
  const attachmentAltLabel = (index: number) =>
    resolveText('create.attachmentAlt', 'Ảnh minh chứng {{index}}', { index });
  const reasonOptionLabel = (value: (typeof REASON_KEYS)[number]) =>
    resolveText(`reasons.${value}`, reasonFallbacks[value]);

  const { data: order, isLoading: loadingOrder } = useQuery({
    queryKey: ['my-order-detail-for-return', orderIdForReturn],
    enabled: Number.isFinite(orderIdForReturn) && orderIdForReturn > 0,
    queryFn: () => orderService.getMyOrderDetail(orderIdForReturn) as Promise<ReturnableOrder>,
  });

  const {
    control,
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderId: orderIdForReturn,
      reason: 'CHANGED_MIND',
      note: '',
      items: [],
      attachments: [],
    },
  });

  const { fields } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');

  useEffect(() => {
    if (order?.items) {
      setValue(
        'items',
        order.items.map((it) => ({
          orderItemId: it.orderItemId,
          quantity: 1,
          selected: false,
          reason: '',
          attachments: [],
          maxQuantity: it.quantity,
        })),
      );
    }
  }, [order, setValue]);

  const mutation = useMutation({
    mutationFn: (payload: CreateReturnPayload) => returnCustomerWriteService.create(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['my-returns'] });
      dispatchReturnSummaryChanged({
        orderId: orderIdForReturn,
        returnRequestId: res.returnRequestId ?? null,
      });
      const newId = res.returnRequestId;
      onSuccess?.(newId);
      if (!newId) {
        onBackToOrders?.();
      }
    },
    onError: async (err: unknown) => {
      const error = err as {
        code?: string;
        message?: string;
        existingReturnId?: number;
        response?: {
          data?: {
            code?: string;
            message?: string;
            error?: {
              code?: string;
              message?: string;
              details?: {
                returnRequestId?: number;
              };
            };
            details?: {
              returnRequestId?: number;
            };
          };
        };
      };
      const errorCode =
        error?.code ??
        error?.response?.data?.error?.code ??
        error?.response?.data?.code ??
        undefined;
      const existingReturnId =
        error?.existingReturnId ??
        error?.response?.data?.error?.details?.returnRequestId ??
        error?.response?.data?.details?.returnRequestId;

      if (errorCode === 'RETURN_ALREADY_EXISTS') {
        if (typeof existingReturnId === 'number' && existingReturnId > 0) {
          queryClient.invalidateQueries({ queryKey: ['my-returns'] });
          dispatchReturnSummaryChanged({
            orderId: orderIdForReturn,
            returnRequestId: existingReturnId,
          });
          setSubmitError(null);
          onExistingReturn?.(existingReturnId);
          return;
        }

        try {
          const existingReturn = await returnOrderReadService.getForOrder(orderIdForReturn);

          if (existingReturn?.returnId) {
            queryClient.invalidateQueries({ queryKey: ['my-returns'] });
            dispatchReturnSummaryChanged({
              orderId: orderIdForReturn,
              returnRequestId: existingReturn.returnId,
            });
            setSubmitError(null);
            onExistingReturn?.(existingReturn.returnId);
            return;
          }
        } catch {
          // Fall through to the user-facing conflict message below.
        }

        setSubmitError(returnExistsLabel);
        return;
      }

      if (errorCode === 'ITEM_SELECTION_REQUIRED') {
        setSubmitError(selectItemErrorLabel);
        return;
      }

      setSubmitError(
        (error instanceof ReturnCustomerWriteError ? error.message : undefined) ??
        error?.response?.data?.error?.message ??
          error?.response?.data?.message ??
          error?.message ??
          unknownErrorLabel,
      );
    },
  });

  const totalAttachmentCount = uploadAssets.length;
  const hasPendingUploads = uploadAssets.some(
    (asset) => asset.status === 'compressing' || asset.status === 'uploading',
  );
  const hasFailedUploads = uploadAssets.some((asset) => asset.status === 'error');
  const submitBlockedByUploads = hasPendingUploads || hasFailedUploads;

  const getUploadedUrls = (scope: UploadScope, itemIndex?: number) =>
    uploadAssetsRef.current
      .filter((asset) => {
        if (asset.scope !== scope || asset.status !== 'uploaded' || !asset.uploadedUrl) {
          return false;
        }

        if (scope === 'item') {
          return asset.itemIndex === itemIndex;
        }

        return true;
      })
      .map((asset) => asset.uploadedUrl!);

  const getAssetsForScope = (scope: UploadScope, itemIndex?: number) =>
    uploadAssets.filter((asset) => {
      if (asset.scope !== scope) return false;
      if (scope === 'item') return asset.itemIndex === itemIndex;
      return true;
    });

  const uploadAsset = async (assetId: string, file: File) => {
    updateUploadAssets((current) =>
      current.map((asset) =>
        asset.id === assetId
          ? { ...asset, status: 'compressing', progress: 8, error: undefined }
          : asset,
      ),
    );

    try {
      const compressed = await compressImage(file, {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 1600,
        initialQuality: 0.82,
      });

      const uploadedImages = await orderService.uploadReturnProofImages(
        orderIdForReturn,
        [compressed.file],
        (progress) => {
          updateUploadAssets((current) =>
            current.map((asset) => {
              if (asset.id !== assetId) return asset;

              const nextStatus =
                progress.status === 'completed'
                  ? 'uploaded'
                  : progress.status === 'failed'
                    ? 'error'
                    : 'uploading';

              return {
                ...asset,
                status: nextStatus,
                progress: progress.percent,
                error: progress.status === 'failed' ? attachmentUploadFailedLabel : undefined,
              };
            }),
          );
        },
      );

      const uploadedUrl = uploadedImages[0]?.url;
      if (!uploadedUrl) {
        throw new Error(attachmentUploadFailedLabel);
      }

      updateUploadAssets((current) =>
        current.map((asset) =>
          asset.id === assetId
            ? {
              ...asset,
              uploadedUrl,
              status: 'uploaded',
              progress: 100,
              error: undefined,
            }
            : asset,
        ),
      );
    } catch {
      updateUploadAssets((current) =>
        current.map((asset) =>
          asset.id === assetId
            ? {
              ...asset,
              status: 'error',
              progress: 0,
              error: attachmentUploadFailedLabel,
            }
            : asset,
        ),
      );
    }
  };

  const queueFiles = (files: File[], scope: UploadScope, itemIndex?: number) => {
    const remainingSlots = MAX_ATTACHMENTS_PER_REQUEST - uploadAssetsRef.current.length;
    if (remainingSlots <= 0) {
      setAttachmentError(attachmentsLimitReachedLabel);
      return;
    }

    const filesWithinLimit = files.slice(0, remainingSlots);
    const validFiles: File[] = [];
    let nextError = '';

    if (files.length > remainingSlots) {
      nextError = attachmentsLimitReachedLabel;
    }

    filesWithinLimit.forEach((file) => {
      if (!isValidImageType(file)) {
        nextError = attachmentInvalidTypeLabel;
        return;
      }

      if (file.size > MAX_ATTACHMENT_FILE_SIZE) {
        nextError = attachmentFileTooLargeLabel;
        return;
      }

      validFiles.push(file);
    });

    setAttachmentError(nextError);

    if (validFiles.length === 0) {
      return;
    }

    const nextAssets = validFiles.map<UploadAsset>((file) => ({
      id: createUploadId(),
      file,
      fileName: file.name,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      status: 'compressing',
      scope,
      itemIndex,
    }));

    updateUploadAssets((current) => [...current, ...nextAssets]);
    nextAssets.forEach((asset) => {
      void uploadAsset(asset.id, asset.file);
    });
  };

  const replaceUploadAsset = (assetId: string, nextFile: File) => {
    const target = uploadAssetsRef.current.find((asset) => asset.id === assetId);
    if (!target) return;

    if (!isValidImageType(nextFile)) {
      setAttachmentError(attachmentInvalidTypeLabel);
      return;
    }

    if (nextFile.size > MAX_ATTACHMENT_FILE_SIZE) {
      setAttachmentError(attachmentFileTooLargeLabel);
      return;
    }

    URL.revokeObjectURL(target.previewUrl);
    setAttachmentError('');

    updateUploadAssets((current) =>
      current.map((asset) =>
        asset.id === assetId
          ? {
            ...asset,
            file: nextFile,
            fileName: nextFile.name,
            previewUrl: URL.createObjectURL(nextFile),
            progress: 0,
            status: 'compressing',
            uploadedUrl: undefined,
            error: undefined,
          }
          : asset,
      ),
    );

    void uploadAsset(assetId, nextFile);
  };

  const removeUploadAsset = (assetId: string) => {
    const target = uploadAssetsRef.current.find((asset) => asset.id === assetId);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
    }

    updateUploadAssets((current) => current.filter((asset) => asset.id !== assetId));

    if (attachmentError) {
      setAttachmentError('');
    }
  };

  const retryUploadAsset = (assetId: string) => {
    const target = uploadAssetsRef.current.find((asset) => asset.id === assetId);
    if (!target) return;

    setAttachmentError('');
    void uploadAsset(assetId, target.file);
  };

  const toggleItemDetails = (index: number) => {
    setExpandedItemIndexes((current) =>
      current.includes(index) ? current.filter((value) => value !== index) : [...current, index],
    );
  };

  const updateItemQuantity = (index: number, delta: number, maxQuantity?: number) => {
    const currentQuantity = watchedItems?.[index]?.quantity ?? 1;
    const nextQuantity = Math.max(1, Math.min(maxQuantity ?? 999, currentQuantity + delta));
    setValue(`items.${index}.quantity`, nextQuantity, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = (values: FormData) => {
    setSubmitError(null);

    if (hasPendingUploads) {
      setSubmitError(attachmentsUploadingLabel);
      return;
    }

    if (hasFailedUploads) {
      setSubmitError(attachmentsResolveErrorsLabel);
      return;
    }

    const selectedItems = values.items.filter((it) => it.selected);
    if (!selectedItems.length) {
      setSubmitError(selectItemErrorLabel);
      return;
    }

    const requestAttachments = getUploadedUrls('request');

    mutation.mutate({
      orderId: Number(values.orderId),
      reason: values.reason as ReturnReason,
      note: values.note || undefined,
      items: values.items.flatMap((item, index) => {
        if (!item.selected) return [];

        const attachments = getUploadedUrls('item', index);
        return [{
          orderItemId: Number(item.orderItemId),
          quantity: Number(item.quantity),
          reasonCode: (item.reason || values.reason) as ReturnReason,
          reasonText: item.reasonText?.trim() ? item.reasonText.trim() : undefined,
          attachments: attachments.length ? attachments : undefined,
        }];
      }),
      attachments: requestAttachments.length ? requestAttachments : undefined,
    });
  };

  const selectedItemCount = watchedItems?.filter((item) => item.selected).length ?? 0;
  const selectedItemsSummary = (watchedItems ?? [])
    .map((item, index) => {
      if (!item.selected) return null;
      const orderItem = order.items.find((candidate) => candidate.orderItemId === item.orderItemId);

      return {
        id: item.orderItemId,
        name: orderItem?.productName ?? itemFallbackLabel(item.orderItemId),
        quantity: item.quantity ?? 1,
      };
    })
    .filter((item): item is { id: number; name: string; quantity: number } => Boolean(item));
  const totalSelectedQuantity = selectedItemsSummary.reduce((sum, item) => sum + item.quantity, 0);
  const totalUploadedAttachmentCount = uploadAssets.filter((asset) => asset.status === 'uploaded').length;
  const noteSummary = (watch('note') || '').trim();
  const primaryButtonClass =
    'inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60';
  const secondaryButtonClass =
    'inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.08]';
  const fieldClass =
    'w-full rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2.5 text-sm text-white placeholder-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/40';

  if (!user) {
    return (
      <div className="p-6">
        <div className={`${refundUi.surface} p-6 text-center text-white/70`}>
          {loginRequiredLabel}
        </div>
      </div>
    );
  }

  if (loadingOrder) {
    return (
      <div className="p-6 flex items-center gap-3 text-white/60">
        <span className="animate-spin text-lg">⏳</span> {loadingOrderLabel}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <Toast msg={orderNotFoundLabel} type="error" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-6 sm:px-6 sm:pb-6">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[2rem] font-black tracking-[-0.04em] text-white">{titleLabel}</h1>
          <button
            type="button"
            onClick={() => onBackToOrders?.()}
            className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-white/55 transition-colors hover:text-white"
          >
            <span aria-hidden="true">←</span>
            {backLabel}
          </button>
        </div>
        <div className="mt-1">
          <p className="mt-0.5 text-sm text-white/60">
            {headerSubtitle(order.orderNumber ?? order.orderId, order.status)}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className={`${refundUi.sectionMuted} px-4 py-3`}>
              <div className={`flex items-center gap-2 ${refundUi.eyeBrow}`}>
                <ShieldCheck size={12} />
                {returnPolicyTitleLabel}
              </div>
              <p className="mt-2 text-sm leading-6 text-white/70">{returnPolicyValueLabel}</p>
            </div>
            <div className={`${refundUi.info} px-4 py-3`}>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-100/75">
                <Clock3 size={12} />
                {processingEtaTitleLabel}
              </div>
              <p className="mt-2 text-sm leading-6 text-white/92">{processingEtaValueLabel}</p>
            </div>
            <div className={`${refundUi.sectionMuted} px-4 py-3`}>
              <div className={`flex items-center gap-2 ${refundUi.eyeBrow}`}>
                <WalletCards size={12} />
                {refundMethodTitleLabel}
              </div>
              <p className="mt-2 text-sm leading-6 text-white/70">{refundMethodValueLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <form id="return-request-form" noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className={`${refundUi.surface} space-y-2 px-5 py-4`}>
          <label className="block text-sm font-semibold text-white/90">
            {reasonLabel} <span className="text-red-400">*</span>
          </label>
          <select
            {...register('reason')}
            className={`${fieldClass} appearance-none`}
          >
            {REASON_KEYS.map((value) => (
              <option key={value} value={value} className="bg-white text-black">
                {reasonOptionLabel(value)}
              </option>
            ))}
          </select>
          <p className="text-xs leading-5 text-white/45">{reasonHintLabel}</p>
        </div>

        <div className={`${refundUi.surface} space-y-4 p-5`}>
          <label className="block text-sm font-semibold text-white/90">
            {itemsLabel} <span className="text-red-400">*</span>
          </label>
          <div className="space-y-2">
            {fields.map((field, idx) => {
              const orderItem = order.items.find((i) => i.orderItemId === field.orderItemId);
              const isSelected = watchedItems?.[idx]?.selected;
              const itemAssets = getAssetsForScope('item', idx);
              const isExpanded = expandedItemIndexes.includes(idx);
              const currentQuantity = watchedItems?.[idx]?.quantity ?? 1;
              const maxQuantity = orderItem?.quantity ?? 999;
              const atMinQuantity = currentQuantity <= 1;
              const atMaxQuantity = currentQuantity >= maxQuantity;
              const thumbnailUrl = (orderItem as (typeof order.items)[number] & { thumbnailUrl?: string | null; thumbnail?: string | null })?.thumbnailUrl
                ?? (orderItem as (typeof order.items)[number] & { thumbnail?: string | null })?.thumbnail
                ?? null;

              return (
                <div
                  key={field.id}
                  className={`rounded-xl border p-4 transition-all duration-150 ${isSelected
                    ? 'border-sky-400/35 bg-sky-400/[0.08] shadow-[0_16px_32px_rgba(0,0,0,0.14)]'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                      {thumbnailUrl ? (
                        <img src={thumbnailUrl} alt={orderItem?.productName ?? itemFallbackLabel(field.orderItemId)} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon size={18} className="text-white/30" />
                      )}
                    </div>

                    <label htmlFor={`item-check-${idx}`} className="min-w-0 flex-1 cursor-pointer">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-white">
                          {orderItem?.productName ?? itemFallbackLabel(field.orderItemId)}
                        </div>
                      </div>
                      <div className="mt-0.5 text-xs text-white/60">
                        {orderItem?.variantName || '-'}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
                        <span>{orderItem?.unitPrice ? `${Number(orderItem.unitPrice).toLocaleString('vi-VN')}đ/sp` : '-'}</span>
                        <span>{purchasedQuantityLabel(orderItem?.quantity ?? 0)}</span>
                      </div>
                    </label>

                    <Controller
                      control={control}
                      name={`items.${idx}.selected`}
                      render={({ field: f }) => (
                        <label
                          htmlFor={`item-check-${idx}`}
                          className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors ${f.value ? 'border-sky-400/50 bg-sky-400/[0.15] text-sky-100' : 'border-white/20 bg-white/[0.03] text-transparent'}`}
                        >
                          <input
                            type="checkbox"
                            id={`item-check-${idx}`}
                            checked={f.value ?? false}
                            onChange={f.onChange}
                            className="sr-only"
                          />
                          <span className="text-sm">✓</span>
                        </label>
                      )}
                    />
                  </div>

                  {isSelected && (
                    <div className="mt-4 space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-white/70">{quantityShortLabel}</label>
                          <div className="flex items-center overflow-hidden rounded-lg border border-white/15 bg-white/[0.05]">
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(idx, -1, orderItem?.quantity)}
                              disabled={atMinQuantity}
                              aria-label={`Giảm số lượng sản phẩm #${field.orderItemId}`}
                              className={`w-10 py-2 text-sm transition-colors ${atMinQuantity ? 'cursor-not-allowed bg-white/[0.02] text-white/25' : 'cursor-pointer bg-white/[0.04] text-white/85 hover:bg-white/10'}`}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={maxQuantity}
                              {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                              className="w-12 border-x border-white/10 bg-transparent px-1 py-2 text-center text-sm font-semibold text-white focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateItemQuantity(idx, 1, orderItem?.quantity)}
                              disabled={atMaxQuantity}
                              aria-label={`Tăng số lượng sản phẩm #${field.orderItemId}`}
                              className={`w-10 py-2 text-sm transition-colors ${atMaxQuantity ? 'cursor-not-allowed bg-white/[0.02] text-white/25' : 'cursor-pointer bg-white/[0.04] text-white/85 hover:bg-white/10'}`}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleItemDetails(idx)}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/85 hover:bg-white/[0.08]"
                        >
                          {itemDetailsToggleLabel}
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className={`${refundUi.sectionMuted} space-y-4 p-4`}>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs font-semibold text-white/80">{itemReasonLabel}</p>
                              <p className="mt-0.5 text-xs text-white/50">{itemReasonHintLabel}</p>
                            </div>
                            <select
                              {...register(`items.${idx}.reason`)}
                              className={`${fieldClass} appearance-none py-2`}
                            >
                              <option value="" className="bg-white text-black">
                                {itemReasonInheritLabel}
                              </option>
                              {REASON_KEYS.map((value) => (
                                <option key={`${field.id}-${value}`} value={value} className="bg-white text-black">
                                  {reasonOptionLabel(value)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-xs font-semibold text-white/80">
                              {itemReasonTextLabel}
                            </label>
                            <textarea
                              {...register(`items.${idx}.reasonText`)}
                              rows={2}
                              placeholder={itemReasonTextPlaceholder}
                              className={`${fieldClass} resize-none py-2`}
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold text-white/80">{itemAttachmentsLabel}</p>
                                <p className="mt-0.5 text-xs text-white/50">{itemAttachmentsHintLabel}</p>
                              </div>
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/60">
                                {itemAssets.length} ảnh
                              </span>
                            </div>

                            <EvidenceUploader
                              compact
                              inputId={`item-proof-upload-${field.id}`}
                              inputLabel={itemAttachmentInputLabel(field.orderItemId)}
                              title={itemAttachmentsDropzoneTitle}
                              description={itemAttachmentsHintLabel}
                              rules={attachmentsRulesLabel}
                              mobileActionLabel={attachmentsDropzoneMobileLabel}
                              desktopActionLabel={itemAttachmentsDropzoneDesktopLabel}
                              assets={itemAssets}
                              disabled={totalAttachmentCount >= MAX_ATTACHMENTS_PER_REQUEST}
                              renderAlt={(index) => itemAttachmentAltLabel(field.orderItemId, index)}
                              onFilesSelected={(files) => queueFiles(files, 'item', idx)}
                              onRemove={removeUploadAsset}
                              onReplace={(assetId, file) => replaceUploadAsset(assetId, file)}
                              onRetry={retryUploadAsset}
                              removeLabel={removeAttachmentLabel}
                              replaceLabel={replaceAttachmentLabel}
                              replaceInputLabel={replaceItemAttachmentInputLabel(field.orderItemId)}
                              retryLabel={retryAttachmentLabel}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {errors.items?.[idx]?.quantity && (
                    <p className="mt-2 text-xs text-red-400">
                      {errors.items[idx]?.quantity?.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${refundUi.surface} space-y-4 p-5`}>
          <div>
            <h2 className={refundUi.sectionTitle}>{commonDetailsLabel}</h2>
            <p className="mt-1 text-sm font-medium text-white/55">{commonDetailsHintLabel}</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/90">{noteLabel}</label>
            <textarea
              {...register('note')}
              rows={3}
              placeholder={notePlaceholderLabel}
              className={`${fieldClass} resize-none`}
            />
            {errors.note && <p className="text-xs text-red-400">{errors.note.message}</p>}
          </div>
        </div>

        <div className={`${refundUi.surface} space-y-4 p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <label className="block text-sm font-semibold text-white/90">{attachmentsLabel}</label>
              <p className="mt-0.5 text-sm text-white/60">{attachmentsHintLabel}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-white/72">
              {attachmentsCounterLabel}
            </span>
          </div>

          <EvidenceUploader
            inputId="request-proof-upload"
            inputLabel={selectAttachmentInputLabel}
            title={attachmentsDropzoneTitle}
            description={attachmentsHintLabel}
            rules={attachmentsRulesLabel}
            mobileActionLabel={attachmentsDropzoneMobileLabel}
            desktopActionLabel={attachmentsDropzoneDesktopLabel}
            assets={getAssetsForScope('request')}
            disabled={totalAttachmentCount >= MAX_ATTACHMENTS_PER_REQUEST}
            renderAlt={(index) => attachmentAltLabel(index)}
            onFilesSelected={(files) => queueFiles(files, 'request')}
            onRemove={removeUploadAsset}
            onReplace={(assetId, file) => replaceUploadAsset(assetId, file)}
            onRetry={retryUploadAsset}
            removeLabel={removeAttachmentLabel}
            replaceLabel={replaceAttachmentLabel}
            replaceInputLabel={replaceAttachmentInputLabel}
            retryLabel={retryAttachmentLabel}
          />

          {attachmentError && <p className="text-xs text-red-400">{attachmentError}</p>}
        </div>

        {submitError && <Toast msg={submitError} type="error" />}

        <div className="pt-2">
          <div className={`${refundUi.surface} mb-4 p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white/90">{summaryTitleLabel}</h3>
                <p className="mt-1 text-xs text-white/50">{summaryHintLabel}</p>
              </div>
              <span className={`${refundUi.subtleBadge} border-sky-400/20 bg-sky-400/[0.08] text-sky-100/85`}>
                {selectedProductsSummaryLabel(selectedItemCount)}
              </span>
            </div>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className={`${refundUi.sectionMuted} px-4 py-3 sm:col-span-2`}>
                <dt className={refundUi.eyeBrow}>
                  {summaryProductsLabel}
                </dt>
                <dd className="mt-2 space-y-1 text-sm text-white/85">
                  {selectedItemsSummary.length > 0 ? (
                    <>
                      {selectedItemsSummary.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3">
                          <span className="truncate">{item.name}</span>
                          <span className="shrink-0 text-white/60">x{item.quantity}</span>
                        </div>
                      ))}
                      {selectedItemsSummary.length > 3 && (
                        <div className="text-xs text-white/50">
                          {summaryMoreItemsLabel(selectedItemsSummary.length - 3)}
                        </div>
                      )}
                    </>
                  ) : (
                    summaryNoNoteLabel
                  )}
                </dd>
              </div>
              <div className={`${refundUi.sectionMuted} px-4 py-3`}>
                <dt className={refundUi.eyeBrow}>
                  {summaryReasonLabel}
                </dt>
                <dd className="mt-1 text-sm text-white/85">
                  {reasonOptionLabel(watch('reason') as (typeof REASON_KEYS)[number])}
                </dd>
              </div>
              <div className={`${refundUi.sectionMuted} px-4 py-3`}>
                <dt className={refundUi.eyeBrow}>
                  {summaryTotalQuantityLabel}
                </dt>
                <dd className="mt-1 text-sm text-white/85">{totalSelectedQuantity}</dd>
              </div>
              <div className={`${refundUi.sectionMuted} px-4 py-3`}>
                <dt className={refundUi.eyeBrow}>
                  {summaryAttachmentsLabel}
                </dt>
                <dd className="mt-1 text-sm text-white/85">{totalUploadedAttachmentCount}</dd>
              </div>
              <div className={`${refundUi.sectionMuted} px-4 py-3 sm:col-span-2`}>
                <dt className={refundUi.eyeBrow}>
                  {summaryNoteLabel}
                </dt>
                <dd className="mt-1 text-sm text-white/85">{noteSummary || summaryNoNoteLabel}</dd>
              </div>
            </dl>
          </div>

          {submitBlockedByUploads && (
            <p className={`mb-3 text-sm ${hasFailedUploads ? 'text-red-300' : 'text-sky-200'}`}>
              {hasFailedUploads ? attachmentsResolveErrorsLabel : attachmentsUploadingLabel}
            </p>
          )}

          <div className="hidden items-center gap-3 sm:flex">
            <button
              type="submit"
              disabled={mutation.isPending || submitBlockedByUploads}
              aria-label={submitLabel}
              className={primaryButtonClass}
            >
              {mutation.isPending ? (
                <>
                  <span className="animate-spin">⏳</span> {submittingLabel}
                </>
              ) : (
                <>
                  <Upload size={16} /> {submitLabel}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => onBackToOrders?.()}
              className={secondaryButtonClass}
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </form>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#090a0c]/95 px-4 py-3 shadow-[0_-12px_30px_rgba(0,0,0,0.35)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white/65">
              {mobileSubmitSummaryLabel(selectedItemCount, totalSelectedQuantity)}
            </p>
            {submitBlockedByUploads && (
              <p className={`mt-1 text-[11px] ${hasFailedUploads ? 'text-red-300' : 'text-sky-200'}`}>
                {hasFailedUploads ? attachmentsResolveErrorsLabel : attachmentsUploadingLabel}
              </p>
            )}
          </div>
          <button
            type="submit"
            form="return-request-form"
            aria-label={mobileSubmitLabel}
            disabled={mutation.isPending || submitBlockedByUploads}
            className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload size={16} />
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
