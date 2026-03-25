import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { returnService, type CreateReturnPayload, type ReturnReason } from '@/common/services/return.service';
import { orderService, type OrderDetail } from '@/common/services/order.service';
import { useAuth } from '@/common/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

// ─── Zod Schema ─────────────────────────────────────────────────────────────
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

// ─── Constants ─────────────────────────────────────────────────────────────
const REASON_KEYS = ['DEFECTIVE', 'WRONG_ITEM', 'SIZE_ISSUE', 'CHANGED_MIND', 'OTHER'] as const;

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  orderIdForReturn: number;
  onSuccess?: (returnId?: number) => void;
  onBackToOrders?: () => void;
}

// ─── Toast helper ────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: 'error' | 'success' }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-sm border p-4 ${type === 'error'
        ? 'border-red-500/30 bg-red-500/10 text-red-300'
        : 'border-green-500/30 bg-green-500/10 text-green-300'
        }`}
    >
      <span className="text-lg">{type === 'error' ? '⚠️' : '✅'}</span>
      <p className="text-sm">{msg}</p>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export const CreateReturnRequest: React.FC<Props> = ({ orderIdForReturn, onSuccess, onBackToOrders }) => {
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attachmentInput, setAttachmentInput] = useState('');
  const formSchema = createReturnSchema(resolveText);
  const unknownErrorLabel = resolveText('create.unknownError', 'Lỗi không xác định');
  const attachmentInvalidUrlLabel = resolveText('create.attachmentInvalidUrl', 'URL ảnh không hợp lệ');
  const selectItemErrorLabel = resolveText('create.selectItemError', 'Chọn ít nhất 1 sản phẩm để trả');
  const loginRequiredLabel = resolveText('create.loginRequired', 'Vui lòng đăng nhập.');
  const loadingOrderLabel = resolveText('create.loadingOrder', 'Đang tải đơn hàng...');
  const orderNotFoundLabel = resolveText('create.orderNotFound', 'Không tìm thấy đơn hàng.');
  const titleLabel = resolveText('create.title', 'Yêu cầu trả hàng');
  const backLabel = resolveText('create.back', 'Quay lại');
  const reasonLabel = resolveText('create.reasonLabel', 'Lý do trả hàng');
  const itemsLabel = resolveText('create.itemsLabel', 'Chọn sản phẩm trả');
  const noteLabel = resolveText('create.noteLabel', 'Ghi chú (tùy chọn)');
  const notePlaceholderLabel = resolveText('create.notePlaceholder', 'Mô tả vấn đề chi tiết...');
  const attachmentsLabel = resolveText('create.attachmentsLabel', 'Ảnh minh chứng (tùy chọn, tối đa 5)');
  const attachmentsHintLabel = resolveText(
    'create.attachmentsHint',
    'Nhập URL ảnh cho mỗi ảnh bằng chứng hỏng/lỗi',
  );
  const attachmentsPlaceholderLabel = resolveText('create.attachmentsPlaceholder', 'https://...');
  const addAttachmentLabel = resolveText('create.addAttachment', '+ Thêm');
  const removeAttachmentLabel = resolveText('create.removeAttachment', 'Xóa');
  const submitLabel = resolveText('create.submit', 'Gửi yêu cầu');
  const submittingLabel = resolveText('create.submitting', 'Đang gửi...');
  const cancelLabel = resolveText('create.cancel', 'Hủy');
  const quantityShortLabel = resolveText('create.quantityShort', 'SL:');
  const headerSubtitle = (orderNumber: string | number, status: string) =>
    resolveText('create.headerSubtitle', 'Đơn #{{orderNumber}} · {{status}}', {
      orderNumber,
      status,
    });
  const itemFallbackLabel = (id: number) => resolveText('create.itemFallback', 'Sản phẩm #{{id}}', { id });
  const purchasedQuantityLabel = (quantity: number) =>
    resolveText('create.purchasedQuantity', 'Đã mua: {{quantity}}', { quantity });
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
  const watchedAttachments = watch('attachments');

  // Populate items from the fetched order
  useEffect(() => {
    if (order?.items) {
      setValue(
        'items',
        order.items.map((it) => ({
          orderItemId: it.orderItemId,
          quantity: 1,
          selected: false,
          reason: '',
          maxQuantity: it.quantity,
        })),
      );
    }
  }, [order, setValue]);

  const mutation = useMutation({
    mutationFn: (payload: CreateReturnPayload) => returnService.create(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['my-returns'] });
      const newId = res.returnRequestId;
      onSuccess?.(newId);
      if (!newId) {
        onBackToOrders?.();
      }
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: { message?: string } } }, message?: string };
      setSubmitError(
        error?.response?.data?.error?.message ?? error?.message ?? unknownErrorLabel,
      );
    },
  });

  const [attachmentError, setAttachmentError] = useState('');

  const addAttachment = () => {
    const url = attachmentInput.trim();
    if (!url) return;

    try {
      new URL(url);
      setAttachmentError('');
    } catch {
      setAttachmentError(attachmentInvalidUrlLabel);
      return;
    }

    const current = watchedAttachments ?? [];
    if (current.length >= 5) return;
    setValue('attachments', [...current, url]);
    setAttachmentInput('');
  };

  const removeAttachment = (idx: number) => {
    const current = watchedAttachments ?? [];
    setValue('attachments', current.filter((_, i) => i !== idx));
  };

  const onSubmit = (values: FormData) => {
    setSubmitError(null);
    const selectedItems = values.items.filter((it) => it.selected);
    if (!selectedItems.length) {
      setSubmitError(selectItemErrorLabel);
      return;
    }

    mutation.mutate({
      orderId: Number(values.orderId),
      reason: values.reason as ReturnReason,
      note: values.note || undefined,
      items: selectedItems.map((it) => ({
        orderItemId: Number(it.orderItemId),
        quantity: Number(it.quantity),
        // Không gửi reason nếu là chuỗi rỗng — validator reject ""
        ...(it.reason ? { reason: it.reason as ReturnReason } : {}),
      })),
      attachments: values.attachments?.length ? values.attachments : undefined,
    });
  };

  // ─── Guard ────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="p-6">
        <div className="rounded-sm border border-white/10 bg-white/5 p-6 text-center text-white/70">
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{titleLabel}</h1>
          <p className="mt-0.5 text-sm text-white/60">
            {headerSubtitle(order.orderNumber ?? order.orderId, order.status)}
          </p>
        </div>
        <button
          onClick={() => onBackToOrders?.()}
          className="rounded-sm border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
        >
          ← {backLabel}
        </button>
      </div>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Reason */}
        <div className="rounded-sm border border-white/10 bg-white/5 p-4 space-y-3">
          <label className="block text-sm font-semibold text-white/90">
            {reasonLabel} <span className="text-red-400">*</span>
          </label>
          <select
            {...register('reason')}
            className="w-full appearance-none rounded-sm border border-white/20 bg-white/10 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          >
            {REASON_KEYS.map((value) => (
              <option key={value} value={value} className="text-black bg-white">
                {reasonOptionLabel(value)}
              </option>
            ))}
          </select>
        </div>

        {/* Items */}
        <div className="rounded-sm border border-white/10 bg-white/5 p-4 space-y-3">
          <label className="block text-sm font-semibold text-white/90">
            {itemsLabel} <span className="text-red-400">*</span>
          </label>
          <div className="space-y-2">
            {fields.map((field, idx) => {
              const orderItem = order.items.find((i) => i.orderItemId === field.orderItemId);
              const isSelected = watchedItems?.[idx]?.selected;
              return (
                <div
                  key={field.id}
                  className={`rounded-sm border transition-all duration-150 ${isSelected
                    ? 'border-sky-500/60 bg-sky-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                    } p-3`}
                >
                  <div className="flex items-start gap-3">
                    <Controller
                      control={control}
                      name={`items.${idx}.selected`}
                      render={({ field: f }) => (
                        <input
                          type="checkbox"
                          id={`item-check-${idx}`}
                          checked={f.value ?? false}
                          onChange={f.onChange}
                          className="mt-1 h-4 w-4 rounded accent-sky-500"
                        />
                      )}
                    />
                    <label htmlFor={`item-check-${idx}`} className="flex-1 cursor-pointer">
                      <div className="font-medium text-white">
                        {orderItem?.productName ?? itemFallbackLabel(field.orderItemId)}
                      </div>
                      <div className="text-xs text-white/60 mt-0.5">
                        {orderItem?.variantName}
                        {orderItem?.unitPrice && (
                          <> · {Number(orderItem.unitPrice).toLocaleString('vi-VN')}đ/sp</>
                        )}
                      </div>
                      <div className="text-xs text-white/50 mt-0.5">
                        {purchasedQuantityLabel(orderItem?.quantity ?? 0)}
                      </div>
                    </label>

                    {isSelected && (
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="text-xs text-white/70">{quantityShortLabel}</label>
                        <input
                          type="number"
                          min={1}
                          max={orderItem?.quantity ?? 999}
                          {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                          className="w-16 rounded-sm border border-white/20 bg-white/10 px-2 py-1 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
                    )}
                  </div>

                  {errors.items?.[idx]?.quantity && (
                    <p className="mt-1 ml-7 text-xs text-red-400">
                      {errors.items[idx]?.quantity?.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Note */}
        <div className="rounded-sm border border-white/10 bg-white/5 p-4 space-y-2">
          <label className="block text-sm font-semibold text-white/90">
            {noteLabel}
          </label>
          <textarea
            {...register('note')}
            rows={3}
            placeholder={notePlaceholderLabel}
            className="w-full rounded-sm border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
          />
          {errors.note && <p className="text-xs text-red-400">{errors.note.message}</p>}
        </div>

        {/* Attachments */}
        <div className="rounded-sm border border-white/10 bg-white/5 p-4 space-y-3">
          <div>
            <label className="block text-sm font-semibold text-white/90">
              {attachmentsLabel}
            </label>
            <p className="text-xs text-white/50 mt-0.5">
              {attachmentsHintLabel}
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="url"
              value={attachmentInput}
              onChange={(e) => {
                setAttachmentInput(e.target.value);
                if (attachmentError) setAttachmentError('');
              }}
              placeholder={attachmentsPlaceholderLabel}
              className="flex-1 rounded-sm border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addAttachment();
                }
              }}
            />
            <button
              type="button"
              onClick={addAttachment}
              disabled={(watchedAttachments?.length ?? 0) >= 5 || !attachmentInput.trim()}
              className="rounded-sm bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 disabled:opacity-40 transition-colors"
            >
              {addAttachmentLabel}
            </button>
          </div>
          {attachmentError && <p className="text-xs text-red-400 mt-1">{attachmentError}</p>}

          {(watchedAttachments?.length ?? 0) > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {watchedAttachments?.map((url, idx) => (
                <div
                  key={idx}
                  className="relative rounded-sm overflow-hidden border border-white/10 bg-white/5 aspect-video flex items-center justify-center"
                >
                  <img
                    src={url}
                    alt={attachmentAltLabel(idx + 1)}
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white text-xs hover:bg-red-600 transition-colors"
                    title={removeAttachmentLabel}
                  >
                    ✕
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-0.5 text-xs text-white/70 truncate">
                    {url}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {submitError && <Toast msg={submitError} type="error" />}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            id="submit-return-form"
            aria-label={submitLabel}
            className="flex items-center gap-2 rounded-sm bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60 transition-colors"
          >
            {mutation.isPending ? (
              <>
                <span className="animate-spin">⏳</span> {submittingLabel}
              </>
            ) : (
              <>📤 {submitLabel}</>
            )}
          </button>
          <button
            type="button"
            onClick={() => onBackToOrders?.()}
            className="rounded-sm border border-white/20 px-5 py-2.5 text-sm text-white/80 hover:bg-white/10 transition-colors"
          >
            {cancelLabel}
          </button>
        </div>
      </form>
    </div>
  );
};
