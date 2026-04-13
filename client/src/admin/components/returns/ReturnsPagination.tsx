import React from 'react';
import { AdminActionButton } from '@/admin/components/AdminUI';

interface ReturnsPaginationProps {
  nextLabel: string;
  onNext: () => void;
  onPrevious: () => void;
  page: number;
  pageLabel: string;
  previousLabel: string;
  totalPages: number;
}

export const ReturnsPagination: React.FC<ReturnsPaginationProps> = ({
  nextLabel,
  onNext,
  onPrevious,
  page,
  pageLabel,
  previousLabel,
  totalPages,
}) => {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 border-t border-white/[0.06] px-6 py-5">
      <AdminActionButton
        onClick={onPrevious}
        disabled={page <= 1}
        size="md"
        className="cursor-pointer text-xs font-bold uppercase tracking-widest"
      >
        {previousLabel}
      </AdminActionButton>
      <span className="px-3 text-xs text-white/40">
        {pageLabel}
      </span>
      <AdminActionButton
        onClick={onNext}
        disabled={page >= totalPages}
        size="md"
        className="cursor-pointer text-xs font-bold uppercase tracking-widest"
      >
        {nextLabel}
      </AdminActionButton>
    </div>
  );
};
