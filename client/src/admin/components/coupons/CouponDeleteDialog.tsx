import React from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { AdminModalShell, AdminSecondaryButton } from '@/admin/components/AdminUI';
import type { Coupon } from '@/common/services/coupon.service';

interface CouponDeleteDialogProps {
  coupon: Coupon;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export const CouponDeleteDialog: React.FC<CouponDeleteDialogProps> = ({
  coupon,
  loading,
  onCancel,
  onConfirm,
  t,
}) => (
  <AdminModalShell
    icon={Trash2}
    iconWrapperClassName="border-red-500/20 bg-red-500/10 text-red-400"
    iconClassName="text-red-400"
    title={t('coupons:delete.title')}
    subtitle={t('coupons:delete.subtitle')}
    onClose={onCancel}
    maxWidthClassName="max-w-sm"
    bodyClassName="p-6"
    footer={(
      <div className="flex justify-end gap-3">
        <AdminSecondaryButton
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-xs"
        >
          {t('common:actions.cancel')}
        </AdminSecondaryButton>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : null}
          {loading ? t('coupons:delete.processing') : t('coupons:delete.action')}
        </button>
      </div>
    )}
  >
    <div className="mb-4 flex items-center gap-3">
      <AlertTriangle size={18} className="text-red-400" />
      <p className="text-sm font-semibold text-white/80">{t('coupons:delete.subtitle')}</p>
    </div>
    <p className="mb-5 text-sm text-white/60">
      Bạn có chắc muốn vô hiệu hóa mã{' '}
      <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono font-bold text-primary">
        {coupon.code}
      </code>
      ? Khách hàng sẽ không thể dùng mã này nữa.
    </p>
  </AdminModalShell>
);
