import React, { useEffect, useState } from 'react';
import { Gift, TicketPercent } from 'lucide-react';
import { formatCurrencyVND } from '@/common/utils/currency';
import { useToast } from '@/common/contexts/ToastContext';
import { type RefundBenefitItem, userService } from '@/store/services/user.service';

const surfaceClassName = 'rounded-sm border border-white/5 bg-surface-dark';
const elevatedCardClassName = 'rounded-sm border border-[rgba(255,255,255,0.08)] bg-[#0f1115] shadow-[0_12px_28px_rgba(0,0,0,0.14)] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)]';

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('vi-VN') : '—';

const getStatusToneClasses = (status?: string | null) => {
  switch ((status ?? '').toUpperCase()) {
    case 'USED':
      return 'border-emerald-300/18 bg-emerald-300/[0.08] text-emerald-50';
    case 'EXPIRED':
      return 'border-amber-300/18 bg-amber-300/[0.08] text-amber-50';
    case 'CANCELLED':
      return 'border-red-300/18 bg-red-300/[0.08] text-red-50';
    default:
      return 'border-sky-300/18 bg-sky-300/[0.08] text-sky-50';
  }
};

const getStatusLabel = (status?: string | null) => {
  switch ((status ?? '').toUpperCase()) {
    case 'USED':
      return 'Đã sử dụng';
    case 'EXPIRED':
      return 'Hết hạn';
    case 'CANCELLED':
      return 'Đã hủy';
    case 'ACTIVE':
      return 'Đang hiệu lực';
    default:
      return status || 'Đang hiệu lực';
  }
};

const getBenefitTypeLabel = (benefitType: string) => {
  switch (benefitType) {
    case 'FREESHIP':
      return 'Ưu đãi giảm phí vận chuyển';
    case 'PERCENTAGE':
      return 'Voucher giảm theo phần trăm';
    default:
      return benefitType;
  }
};

const formatBenefitSummary = (summary: string) =>
  summary.replace(/^Available\s+/i, '').trim();

const getBenefitHeadline = (benefit: RefundBenefitItem) => {
  if (benefit.benefitType === 'PERCENTAGE' && benefit.percentValue) {
    return `${benefit.percentValue}%`;
  }

  if (benefit.benefitType === 'FREESHIP') {
    return 'Giảm phí vận chuyển';
  }

  return formatBenefitSummary(benefit.summary);
};

const getBenefitSubheadline = (benefit: RefundBenefitItem) => {
  if (benefit.benefitType === 'PERCENTAGE' && benefit.maxDiscountAmount) {
    return `Tối đa ${formatCurrencyVND(benefit.maxDiscountAmount)}`;
  }

  return null;
};

const getMinimumOrderLabel = (amount: number) =>
  amount > 0 ? formatCurrencyVND(amount) : 'Không yêu cầu tối thiểu';

const LoadingBenefitCards = () => (
  <div className="grid gap-4 xl:grid-cols-2" aria-hidden="true">
    {Array.from({ length: 2 }).map((_, index) => (
      <div key={`refund-benefit-skeleton-${index}`} className={`${elevatedCardClassName} animate-pulse overflow-hidden p-5`}>
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-4">
              <div className="h-6 w-32 rounded-full bg-primary/20" />
              <div className="h-10 w-48 rounded-full bg-white/10" />
            </div>
            <div className="h-7 w-24 rounded-full bg-white/10" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-sm border border-white/10 bg-black/15 p-4">
              <div className="space-y-3">
                <div className="h-3 w-28 rounded-full bg-white/10" />
                <div className="h-4 w-24 rounded-full bg-white/5" />
              </div>
            </div>
            <div className="rounded-sm border border-white/10 bg-black/15 p-4">
              <div className="space-y-3">
                <div className="h-3 w-20 rounded-full bg-white/10" />
                <div className="h-4 w-24 rounded-full bg-white/5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

type ProfileRefundBenefitsSectionProps = {
  isActive?: boolean;
};

export const ProfileRefundBenefitsSection: React.FC<ProfileRefundBenefitsSectionProps> = ({ isActive = true }) => {
  const { showToast } = useToast();
  const [benefits, setBenefits] = useState<RefundBenefitItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBenefits = async () => {
      try {
        setLoading(true);
        const data = await userService.getRefundBenefits();
        setBenefits(data);
      } catch (error) {
        const typedError = error as Error | { message?: string };
        showToast({
          type: 'error',
          title: typedError.message || 'Không thể tải danh sách ưu đãi hoàn tiền.',
        });
      } finally {
        setLoading(false);
      }
    };

    void loadBenefits();
  }, []);

  return (
    <section
      id={isActive ? 'profile-content' : undefined}
      aria-hidden={!isActive}
      className={`${surfaceClassName} overflow-hidden p-6 ${isActive ? '' : 'hidden'}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-black">Mã giảm giá</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-white/58">
            Lưu lại các voucher và ưu đãi mà hệ thống phát hành sau khi yêu cầu hoàn tiền bằng chuyển khoản được hoàn tất.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
          <Gift size={12} />
          {benefits.length} ưu đãi
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          <LoadingBenefitCards />
        ) : benefits.length === 0 ? (
          <div className={`${elevatedCardClassName} p-8 text-center`}>
            <TicketPercent size={26} className="mx-auto text-white/45" />
            <h3 className="mt-4 text-xl font-bold">Chưa có ưu đãi nào</h3>
            <p className="mt-2 text-sm leading-7 text-white/58">
              Sau khi một yêu cầu hoàn tiền được xử lý thành công, voucher hỗ trợ lần mua sau sẽ được hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {benefits.map((benefit) => (
              <article key={benefit.refundBenefitId} className={`${elevatedCardClassName} overflow-hidden`}>
                <div className="flex h-full flex-col gap-5 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="inline-flex items-center gap-2 rounded-full border border-red-500/14 bg-red-500/6 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-red-300/85">
                        <TicketPercent size={11} />
                        {getBenefitTypeLabel(benefit.benefitType)}
                      </div>
                    </div>
                    <span className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] opacity-90 ${getStatusToneClasses(benefit.status)}`}>
                      {getStatusLabel(benefit.status)}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-[42px] font-black leading-none text-white">
                      {getBenefitHeadline(benefit)}
                    </h3>
                    {getBenefitSubheadline(benefit) && (
                      <div className="mt-2 text-base font-semibold text-[#8b95a7]">
                        {getBenefitSubheadline(benefit)}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-sm border border-white/[0.06] bg-black/10 p-3.5">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b95a7]">Đơn tối thiểu</div>
                      <div className="mt-3 text-sm font-semibold text-white">
                        {getMinimumOrderLabel(benefit.minOrderValue)}
                      </div>
                    </div>

                    <div className="rounded-sm border border-white/[0.06] bg-black/10 p-3.5">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b95a7]">Hạn dùng</div>
                      <div className="mt-3 text-sm font-semibold text-white whitespace-nowrap">{formatDate(benefit.validUntil)}</div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
