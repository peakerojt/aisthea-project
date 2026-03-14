import React from 'react';
import { Header } from '@/store/components/Header';
import { useTranslation } from 'react-i18next';

export const Tracking: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'adminTracking' });

  return (
    <div className="flex flex-col h-screen w-full bg-bg-dark text-white font-display overflow-hidden relative">
      <Header />

      <div className="absolute inset-0 z-0 bg-neutral-900 overflow-hidden">
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

      <div className="absolute top-28 left-8 md:top-32 md:left-12 w-[380px] z-20">
        <div className="bg-black/80 backdrop-blur-md p-5 rounded-lg shadow-2xl flex flex-col gap-5 border border-white/10">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-primary text-xs font-bold tracking-wider uppercase">{t('badge')}</span>
              </div>
              <h2 className="text-white text-2xl font-bold">{t('orderCode')}</h2>
            </div>
          </div>

          <div className="flex gap-4 items-center bg-white/5 p-3 rounded border border-white/5">
            <div className="w-16 h-16 bg-white/10 rounded overflow-hidden">
              <img src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=200" alt={t('productImageAlt')} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <h3 className="text-white text-sm font-medium truncate">{t('productName')}</h3>
              <p className="text-gray-400 text-xs">{t('productMeta')}</p>
              <p className="text-white text-xs font-medium mt-1">{t('statusMessage')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <span className="text-gray-400 text-xs font-medium">{t('deliveryLabel')}</span>
              <span className="text-primary text-sm font-bold">{t('deliveryTime')}</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[75%] rounded-full relative overflow-hidden">
                <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-wide mt-1">
              <span>{t('progress.dispatched')}</span>
              <span>{t('progress.delivered')}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-1">
            <button className="flex items-center justify-center gap-2 h-10 rounded border border-white/10 hover:bg-white/5 text-white text-xs font-semibold transition-all">
              {t('actions.support')}
            </button>
            <button className="flex items-center justify-center gap-2 h-10 rounded bg-primary hover:bg-red-700 text-white text-xs font-semibold shadow-lg shadow-primary/20 transition-all">
              {t('actions.viewDetails')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
