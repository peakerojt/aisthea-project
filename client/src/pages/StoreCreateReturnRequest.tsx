import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { returnService } from '../services/return.service';
import { orderService } from '../services/order.service';
import { useAuth } from '../contexts/AuthContext';
import { ViewState } from '../types';

// ─── Zod Schema ─────────────────────────────────────────────────────────────
const returnItemSchema = z.object({
  orderItemId: z.number().int().positive(),
  quantity: z.number().int().min(1, 'Số lượng tối thiểu là 1'),
  reason: z.string().optional(),
  selected: z.boolean(),
  maxQuantity: z.number().optional(),
});

const createReturnSchema = z.object({
  orderId: z.number().int().positive(),
  reason: z.enum(['DEFECTIVE', 'WRONG_ITEM', 'SIZE_ISSUE', 'CHANGED_MIND', 'OTHER']),
  note: z.string().max(500).optional(),
  items: z.array(returnItemSchema),
  attachments: z.array(z.string().url('URL ảnh không hợp lệ')).max(5).optional(),
});

type FormData = z.infer<typeof createReturnSchema>;

const REASONS = [
  { value: 'DEFECTIVE', label: '🔧 Hàng lỗi / hỏng' },
  { value: 'WRONG_ITEM', label: '📦 Giao sai sản phẩm' },
  { value: 'SIZE_ISSUE', label: '📏 Sai kích thước / màu sắc' },
  { value: 'CHANGED_MIND', label: '💭 Tôi đổi ý' },
  { value: 'OTHER', label: '❓ Lý do khác' },
];

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  setView: (v: ViewState) => void;
  orderIdForReturn: number;
  setReturnId?: (id: number) => void;
}

// ─── Toast helper ────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: 'error' | 'success' }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 ${type === 'error'
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
export const StoreCreateReturnRequest: React.FC<Props> = ({ setView, orderIdForReturn, setReturnId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attachmentInput, setAttachmentInput] = useState('');

  const { data: order, isLoading: loadingOrder } = useQuery({
    queryKey: ['my-order-detail-for-return', orderIdForReturn],
    queryFn: () => orderService.getMyOrderDetail(orderIdForReturn),
    enabled: Number.isFinite(orderIdForReturn) && orderIdForReturn > 0,
  });

  const {
    control,
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(createReturnSchema),
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
        order.items.map((it: any) => ({
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
    mutationFn: (payload: any) => returnService.request(payload.orderId, payload.reason, payload.attachments ?? []),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['my-returns'] });
      const newId = res?.returnId;
      if (newId && setReturnId) {
        setReturnId(newId);
        setView('STORE_RETURN_DETAIL');
      } else {
        setView('STORE_MY_RETURNS');
      }
    },
    onError: (err: any) => {
      setSubmitError(
        err?.response?.data?.error?.message ?? err?.message ?? 'Lỗi không xác định',
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
      setAttachmentError('URL ảnh không hợp lệ');
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
      setSubmitError('Vui lòng chọn ít nhất 1 sản phẩm để trả.');
      return;
    }

    mutation.mutate({
      orderId: Number(values.orderId),
      reason: values.reason,
      note: values.note || undefined,
      items: selectedItems.map((it) => ({
        orderItemId: Number(it.orderItemId),
        quantity: Number(it.quantity),
        // Không gửi reason nếu là chuỗi rỗng — validator reject ""
        ...(it.reason ? { reason: it.reason } : {}),
      })),
      attachments: values.attachments?.length ? values.attachments : undefined,
    });
  };

  // ─── Guard ────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-white/70">
          Vui lòng đăng nhập.
        </div>
      </div>
    );
  }

  if (loadingOrder) {
    return (
      <div className="p-6 flex items-center gap-3 text-white/60">
        <span className="animate-spin text-lg">⏳</span> Đang tải đơn hàng...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <Toast msg="Không tìm thấy đơn hàng." type="error" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Yêu cầu trả hàng</h1>
          <p className="mt-0.5 text-sm text-white/60">
            Đơn #{order.orderNumber ?? order.orderId} · {order.status}
          </p>
        </div>
        <button
          onClick={() => setView('STORE_MY_ORDERS')}
          className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
        >
          ← Quay lại
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Reason */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <label className="block text-sm font-semibold text-white/90">
            Lý do trả hàng <span className="text-red-400">*</span>
          </label>
          <select
            {...register('reason')}
            className="w-full appearance-none rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value} className="text-black bg-white">
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Items */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <label className="block text-sm font-semibold text-white/90">
            Chọn sản phẩm trả <span className="text-red-400">*</span>
          </label>
          <div className="space-y-2">
            {fields.map((field, idx) => {
              const orderItem = order.items.find((i: any) => i.orderItemId === field.orderItemId);
              const isSelected = watchedItems?.[idx]?.selected;
              return (
                <div
                  key={field.id}
                  className={`rounded-lg border transition-all duration-150 ${isSelected
                    ? 'border-indigo-500/60 bg-indigo-500/10'
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
                          className="mt-1 h-4 w-4 rounded accent-indigo-500"
                        />
                      )}
                    />
                    <label htmlFor={`item-check-${idx}`} className="flex-1 cursor-pointer">
                      <div className="font-medium text-white">
                        {orderItem?.productName ?? `Item #${field.orderItemId}`}
                      </div>
                      <div className="text-xs text-white/60 mt-0.5">
                        {orderItem?.variantName}
                        {orderItem?.unitPrice && (
                          <> · {Number(orderItem.unitPrice).toLocaleString('vi-VN')}đ/sp</>
                        )}
                      </div>
                      <div className="text-xs text-white/50 mt-0.5">
                        Đã mua: {orderItem?.quantity}
                      </div>
                    </label>

                    {isSelected && (
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="text-xs text-white/70">SL:</label>
                        <input
                          type="number"
                          min={1}
                          max={orderItem?.quantity ?? 999}
                          {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                          className="w-16 rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
          <label className="block text-sm font-semibold text-white/90">
            Ghi chú (tùy chọn)
          </label>
          <textarea
            {...register('note')}
            rows={3}
            placeholder="Mô tả vấn đề chi tiết..."
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
          />
          {errors.note && <p className="text-xs text-red-400">{errors.note.message}</p>}
        </div>

        {/* Attachments */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div>
            <label className="block text-sm font-semibold text-white/90">
              Ảnh minh chứng (tùy chọn, tối đa 5)
            </label>
            <p className="text-xs text-white/50 mt-0.5">
              Nhập URL ảnh cho mỗi ảnh bằng chứng hỏng/lỗi
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
              placeholder="https://..."
              className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
              className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 disabled:opacity-40 transition-colors"
            >
              + Thêm
            </button>
          </div>
          {attachmentError && <p className="text-xs text-red-400 mt-1">{attachmentError}</p>}

          {(watchedAttachments?.length ?? 0) > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {watchedAttachments?.map((url, idx) => (
                <div
                  key={idx}
                  className="relative rounded-lg overflow-hidden border border-white/10 bg-white/5 aspect-video flex items-center justify-center"
                >
                  <img
                    src={url}
                    alt={`attachment-${idx}`}
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white text-xs hover:bg-red-600 transition-colors"
                    title="Xóa"
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
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
          >
            {mutation.isPending ? (
              <>
                <span className="animate-spin">⏳</span> Đang gửi...
              </>
            ) : (
              <>📤 Gửi yêu cầu</>
            )}
          </button>
          <button
            type="button"
            onClick={() => setView('STORE_MY_ORDERS')}
            className="rounded-xl border border-white/20 px-5 py-2.5 text-sm text-white/80 hover:bg-white/10 transition-colors"
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
};
