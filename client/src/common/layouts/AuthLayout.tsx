import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/common/components/Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
  backgroundImage: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, backgroundImage }) => {
  const { t } = useTranslation('pages', { keyPrefix: 'authLayout' });
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full bg-black text-white">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        {/* Left Side: Image */}
        <div className="group relative hidden min-h-screen w-[49%] overflow-hidden isolate [contain:paint] lg:block">
          <div
            className="ui-stable-media pointer-events-none absolute inset-0 bg-cover bg-center transition-transform duration-[18s] ease-linear motion-safe:group-hover:scale-[1.06]"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.1),transparent_26%),linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.68)_68%,rgba(0,0,0,0.9))]" />
          <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-black via-black/88 to-transparent" />
          <div className="absolute left-9 top-9 z-10">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="ui-stable-click rounded-sm text-white transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
            >
              <Logo className="text-3xl" />
            </button>
          </div>
          <div className="absolute bottom-10 left-9 z-10 max-w-[22rem] space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/45">{t('desktopEyebrow')}</p>
            <p className="text-[2.65rem] font-black uppercase leading-[0.96] tracking-[-0.045em] text-white">
              {t('desktopTitle')}
            </p>
            <p className="max-w-[19rem] text-sm leading-7 text-white/48">{t('desktopDescription')}</p>
          </div>
        </div>

        {/* Right Side: Form Content */}
        <div className="relative flex min-h-screen w-full flex-1 overflow-hidden bg-black">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.12),_transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.015),transparent_22%)]" />
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-12 bg-gradient-to-r from-black via-black/30 to-transparent lg:block" />
          <div className="relative z-10 flex w-full flex-col px-5 pb-8 pt-6 sm:px-8 sm:pb-10 sm:pt-8 lg:px-20 lg:py-16">
            <div className="mb-10 flex items-center justify-between border-b border-white/8 pb-4 lg:hidden">
              <button
                type="button"
                className="ui-stable-click rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
                onClick={() => navigate('/')}
              >
                <Logo className="text-xl" />
              </button>
              <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/40">{t('mobileEyebrow')}</span>
            </div>
            <div className="mx-auto flex w-full max-w-[470px] flex-1 animate-fade-in flex-col justify-start lg:max-w-[490px] lg:pt-4">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

