import React, { useState } from 'react';
import { Loader2, TicketPercent, Wand2 } from 'lucide-react';
import {
  COUPON_MIN_ORDER_PRESET_VALUES,
  DEFAULT_ADMIN_COUPON_MIN_ORDER_VALUE,
  resolveCouponMinOrderPresetBackfill,
} from '@validation';
import {
  AdminModalShell,
  AdminPrimaryButton,
  AdminSecondaryButton,
  adminUiTokens,
} from '@/admin/components/AdminUI';
import {
  createCoupon,
  updateCoupon,
  type Coupon,
  type CouponType,
  type CreateCouponPayload,
} from '@/common/services/coupon.service';
import { mapZodFieldErrors } from '@/common/validation/errors';
import { createCouponClientSchema, updateCouponClientSchema } from '@/common/validation/schemas';

interface FormErrors {
  [key: string]: string;
}

interface CouponDialogProps {
  coupon: Coupon | null;
  formatCurrencyInput: (value: string) => string;
  generateCode: () => string;
  normalizeCurrencyInput: (value: string) => string;
  onClose: () => void;
  onSaved: () => void;
  setToast: (toast: { message: string; type: 'success' | 'error' }) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  toInputDate: (iso: string) => string;
}

export const CouponDialog: React.FC<CouponDialogProps> = ({
  coupon,
  formatCurrencyInput,
  generateCode,
  normalizeCurrencyInput,
  onClose,
  onSaved,
  setToast,
  t,
  toInputDate,
}) => {
  const isEdit = coupon !== null;
  const todayInputValue = React.useMemo(() => {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 10);
  }, []);

  const [code, setCode] = useState(coupon?.code ?? '');
  const [type, setType] = useState<CouponType>(coupon?.type ?? 'FIXED_AMOUNT');
  const [value, setValue] = useState(coupon ? String(coupon.value) : '');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(
    coupon?.maxDiscountAmount != null ? String(coupon.maxDiscountAmount) : '',
  );
  const [minOrderValue, setMinOrderValue] = useState(
    String(
      coupon
        ? resolveCouponMinOrderPresetBackfill(coupon.minOrderValue)
        : DEFAULT_ADMIN_COUPON_MIN_ORDER_VALUE,
    ),
  );
  const [startDate, setStartDate] = useState(coupon ? toInputDate(coupon.startDate) : '');
  const [endDate, setEndDate] = useState(coupon ? toInputDate(coupon.endDate) : '');
  const [usageLimit, setUsageLimit] = useState(coupon ? String(coupon.usageLimit) : '100');
  const [usagePerUser, setUsagePerUser] = useState(coupon ? String(coupon.usagePerUser) : '1');
  const [isActive, setIsActive] = useState(coupon?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const endDateMinValue = startDate && startDate > todayInputValue ? startDate : todayInputValue;

  const handleCurrencyInput = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    fallback = '',
  ) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizeCurrencyInput(event.target.value);
    setter(normalized || fallback);
  };

  const buildPayload = (): CreateCouponPayload => ({
    code: code.toUpperCase().trim(),
    type,
    value: Number(value),
    maxDiscountAmount: type === 'PERCENTAGE' && maxDiscountAmount ? Number(maxDiscountAmount) : null,
    minOrderValue: Number(minOrderValue) || DEFAULT_ADMIN_COUPON_MIN_ORDER_VALUE,
    startDate,
    endDate,
    usageLimit: Number(usageLimit),
    usagePerUser: Number(usagePerUser) || 1,
    isActive,
  });

  const validate = (): CreateCouponPayload | null => {
    const payload = buildPayload();
    const result = (isEdit ? updateCouponClientSchema : createCouponClientSchema).safeParse(payload);

    if (!result.success) {
      setErrors(mapZodFieldErrors(result.error));
      return null;
    }

    setErrors({});
    return result.data as CreateCouponPayload;
  };

  const handleSubmit = async () => {
    const payload = validate();
    if (!payload) return;
    setSaving(true);
    try {
      if (isEdit) {
        await updateCoupon(coupon.couponId, payload);
        setToast({ message: t('coupons:feedback.updateSuccess'), type: 'success' });
      } else {
        await createCoupon(payload);
        setToast({ message: t('coupons:feedback.createSuccess'), type: 'success' });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      const msg = error?.response?.data?.error ?? error?.message ?? 'Có lỗi xảy ra.';
      setToast({ message: msg, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full ${adminUiTokens.fieldControl} rounded-lg px-4 placeholder:text-white/25 focus:ring-1 ${
      errors[field]
        ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30'
        : 'focus:ring-primary/40'
    }`;

  const labelClass = `${adminUiTokens.fieldLabel} text-white/50 tracking-wider`;

  return (
    <AdminModalShell
      icon={TicketPercent}
      title={isEdit ? t('coupons:form.titleEdit') : t('coupons:form.titleCreate')}
      subtitle={isEdit ? t('coupons:form.subtitleEdit', { code: coupon.code }) : t('coupons:form.subtitleCreate')}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      panelClassName="max-h-[90vh] overflow-y-auto"
      bodyClassName="space-y-5 p-6"
      stickyHeader
      footer={(
        <div className="flex justify-end gap-3">
          <AdminSecondaryButton
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs"
          >
            {t('common:actions.cancel')}
          </AdminSecondaryButton>
          <AdminPrimaryButton
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg px-6 py-2 text-xs uppercase tracking-wider disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? t('coupons:form.saving') : isEdit ? t('coupons:form.update') : t('coupons:form.create')}
          </AdminPrimaryButton>
        </div>
      )}
    >
      <div>
        <label className={labelClass}>{t('coupons:form.labelCode')}</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={t('coupons:form.codePlaceholder')}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className={`${inputClass('code')} flex-1 font-mono tracking-widest`}
          />
          <button
            type="button"
            onClick={() => setCode(generateCode())}
            title={t('coupons:form.generateCode')}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white/50 transition-colors hover:border-white/25 hover:bg-white/[0.07] hover:text-white"
          >
            <Wand2 size={14} />
            {t('coupons:form.generateCode')}
          </button>
        </div>
        {errors.code && <p className="mt-1 text-[11px] text-red-400">{errors.code}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t('coupons:form.labelType')}</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as CouponType);
              setMaxDiscountAmount('');
            }}
            className={`${inputClass('type')} cursor-pointer`}
          >
            <option value="FIXED_AMOUNT">{t('coupons:form.typeFixed')}</option>
            <option value="PERCENTAGE">{t('coupons:form.typePercent')}</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>
            {type === 'PERCENTAGE' ? t('coupons:form.labelValuePercent') : t('coupons:form.labelValueFixed')}
          </label>
          <input
            type={type === 'PERCENTAGE' ? 'number' : 'text'}
            inputMode={type === 'PERCENTAGE' ? undefined : 'numeric'}
            min={type === 'PERCENTAGE' ? 1 : undefined}
            max={type === 'PERCENTAGE' ? 100 : undefined}
            step={type === 'PERCENTAGE' ? 1 : undefined}
            value={type === 'PERCENTAGE' ? value : formatCurrencyInput(value)}
            onChange={type === 'PERCENTAGE' ? (e) => setValue(e.target.value) : handleCurrencyInput(setValue)}
            className={inputClass('value')}
            placeholder={type === 'PERCENTAGE' ? t('coupons:form.placeholders.valuePercent') : t('coupons:form.placeholders.valueFixed')}
          />
          {errors.value && <p className="mt-1 text-[11px] text-red-400">{errors.value}</p>}
        </div>
      </div>

      {type === 'PERCENTAGE' && (
        <div className="rounded-xl border border-blue-500/15 bg-blue-500/[0.04] p-4">
          <label className={`${labelClass} text-blue-400/70`}>
            {t('coupons:form.labelMaxDiscount')}
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={formatCurrencyInput(maxDiscountAmount)}
            onChange={handleCurrencyInput(setMaxDiscountAmount)}
            className="w-full rounded-lg border border-blue-500/20 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/25 transition-colors focus:border-blue-500/40 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
            placeholder={t('coupons:form.placeholders.maxDiscount')}
          />
          <p className="mt-1.5 text-[10px] text-white/30">
            {t('coupons:form.maxDiscountNote')}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t('coupons:form.labelMinOrder')}</label>
          <select
            value={minOrderValue}
            onChange={(e) => setMinOrderValue(e.target.value)}
            className={`${inputClass('minOrderValue')} cursor-pointer`}
          >
            {COUPON_MIN_ORDER_PRESET_VALUES.map((presetValue) => (
              <option key={presetValue} value={presetValue}>
                {formatCurrencyInput(String(presetValue))}
              </option>
            ))}
          </select>
          {errors.minOrderValue && <p className="mt-1 text-[11px] text-red-400">{errors.minOrderValue}</p>}
        </div>
        <div>
          <label className={labelClass}>{t('coupons:form.labelPerUser')}</label>
          <input
            type="number"
            min={1}
            value={usagePerUser}
            onChange={(e) => setUsagePerUser(e.target.value)}
            className={inputClass('usagePerUser')}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t('coupons:form.labelStartDate')}</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={todayInputValue}
            className={`${inputClass('startDate')} [color-scheme:dark]`}
          />
          {errors.startDate && <p className="mt-1 text-[11px] text-red-400">{errors.startDate}</p>}
        </div>
        <div>
          <label className={labelClass}>{t('coupons:form.labelEndDate')}</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={endDateMinValue}
            className={`${inputClass('endDate')} [color-scheme:dark]`}
          />
          {errors.endDate && <p className="mt-1 text-[11px] text-red-400">{errors.endDate}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t('coupons:form.labelLimit')}</label>
          <input
            type="number"
            min={1}
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
            className={inputClass('usageLimit')}
          />
          {errors.usageLimit && <p className="mt-1 text-[11px] text-red-400">{errors.usageLimit}</p>}
        </div>
        <div className="flex flex-col justify-end">
          <label className={labelClass}>{t('coupons:form.labelStatus')}</label>
          <button
            type="button"
            onClick={() => setIsActive((p) => !p)}
            className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
              isActive
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-white/[0.10] bg-white/[0.04] text-white/40'
            }`}
          >
            <div
              className={`relative h-5 w-9 rounded-full border transition-colors ${
                isActive ? 'border-emerald-500 bg-emerald-500' : 'border-white/20 bg-white/10'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  isActive ? 'translate-x-4' : ''
                }`}
              />
            </div>
            {isActive ? t('coupons:form.statusActive') : t('coupons:form.statusInactive')}
          </button>
        </div>
      </div>
    </AdminModalShell>
  );
};
