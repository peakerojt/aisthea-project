import React from 'react';
import { Headset, MapPinned, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  AdminBadge,
  AdminPageHeader,
  AdminPageShell,
  AdminPrimaryButton,
  AdminSecondaryButton,
  AdminSectionCard,
  adminUiTokens,
} from '@/admin/components/AdminUI';

export const Tracking: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'adminTracking' });

  return (
    <AdminPageShell className="relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[28px] border border-white/[0.04] bg-neutral-900">
        <img
          src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2000&auto=format&fit=crop"
          className="w-full h-full object-cover opacity-30 grayscale mix-blend-overlay"
          alt={t('mapAlt')}
        />
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <path d="M 200 600 Q 500 400 800 300" stroke="#E2241D" strokeWidth="2" fill="none" strokeDasharray="10" className="animate-pulse" />
          <circle cx="800" cy="300" r="8" fill="#E2241D" className="animate-ping" />
          <circle cx="800" cy="300" r="4" fill="white" />
        </svg>
      </div>

      <div className="relative z-10 flex min-h-full flex-col gap-6">
        <AdminPageHeader
          icon={MapPinned}
          eyebrow={t('badge')}
          title={t('orderCode')}
          subtitle={t('statusMessage')}
          meta={`${t('deliveryLabel')}: ${t('deliveryTime')}`}
          actions={<AdminBadge tone="success" dot>{t('badge')}</AdminBadge>}
        />

        <div className="flex flex-1 items-start">
          <AdminSectionCard
            className="w-full max-w-[420px] bg-black/82 shadow-[0_22px_60px_rgba(0,0,0,0.45)]"
            bodyClassName="space-y-5 p-5 lg:p-6"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3.5">
              <div className="h-16 w-16 overflow-hidden rounded-xl bg-white/10">
                <img
                  src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=200"
                  alt={t('productImageAlt')}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 space-y-1">
                <h3 className="truncate text-sm font-semibold text-white">{t('productName')}</h3>
                <p className="text-xs text-white/42">{t('productMeta')}</p>
                <div className="inline-flex">
                  <AdminBadge tone="info" dot>{t('statusMessage')}</AdminBadge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <span className="text-xs font-medium text-white/45">{t('deliveryLabel')}</span>
                <span className="text-sm font-bold text-primary">{t('deliveryTime')}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="relative h-full w-[75%] overflow-hidden rounded-full bg-primary">
                  <div className="absolute inset-0 w-full animate-pulse bg-white/20" />
                </div>
              </div>
              <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-white/34">
                <span>{t('progress.dispatched')}</span>
                <span>{t('progress.delivered')}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/18 bg-primary/10">
                  <Truck size={16} className="text-primary" />
                </div>
                <div>
                  <p className={adminUiTokens.labelText}>{t('deliveryLabel')}</p>
                  <p className="mt-1 text-sm text-white/74">{t('statusMessage')}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AdminSecondaryButton type="button" className="w-full">
                <Headset size={15} />
                {t('actions.support')}
              </AdminSecondaryButton>
              <AdminPrimaryButton type="button" className="w-full">
                <Truck size={15} />
                {t('actions.viewDetails')}
              </AdminPrimaryButton>
            </div>
          </AdminSectionCard>
        </div>
      </div>
    </AdminPageShell>
  );
};
