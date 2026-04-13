import React from 'react';
import { AdminActionButton } from '@/admin/components/AdminUI';

interface CouponsPaginationProps {
  loading: boolean;
  onNext: () => void;
  onPrevious: () => void;
  page: number;
  pageSize: number;
  t: (key: string, opts?: Record<string, unknown>) => string;
  totalPages: number;
}

export const CouponsPagination: React.FC<CouponsPaginationProps> = ({
  loading,
  onNext,
  onPrevious,
  page,
  pageSize,
  t,
  totalPages,
}) => {
  if (loading || totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <AdminActionButton
        onClick={onPrevious}
        disabled={page === 1}
        className="text-white/50 hover:text-white"
      >
        ← {t('common:actions.previous', { defaultValue: 'Trước' })}
      </AdminActionButton>
      <span className="px-2 text-xs text-white/40">
        {t('common:pagination.pageStatus', {
          defaultValue: 'Trang {{page}} / {{totalPages}} · {{pageSize}} / trang',
          page,
          pageSize,
          totalPages,
        })}
      </span>
      <AdminActionButton
        onClick={onNext}
        disabled={page === totalPages}
        className="text-white/50 hover:text-white"
      >
        {t('common:actions.next', { defaultValue: 'Tiếp' })} →
      </AdminActionButton>
    </div>
  );
};
