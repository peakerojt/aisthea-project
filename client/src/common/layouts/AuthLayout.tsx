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
        <div className="group relative hidden min-h-screen w-[48%] overflow-hidden isolate [contain:paint] lg:block">
          <div
            className="ui-stable-media pointer-events-none absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-linear motion-safe:group-hover:scale-110"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.72)_72%,rgba(0,0,0,0.92))]" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black via-black/60 to-transparent" />
          <div className="absolute left-10 top-10 z-10">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="ui-stable-click rounded-sm text-white transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
            >
              <Logo className="text-3xl" />
            </button>
          </div>
          <div className="absolute bottom-12 left-10 z-10 max-w-sm space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/60">{t('desktopEyebrow')}</p>
            <p className="text-3xl font-black uppercase leading-tight tracking-[-0.04em] text-white">
              {t('desktopTitle')}
            </p>
            <p className="text-sm leading-7 text-white/60">{t('desktopDescription')}</p>
          </div>
        </div>

        {/* Right Side: Form Content */}
        <div className="relative flex min-h-screen w-full flex-1 overflow-hidden bg-black">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.18),_transparent_26%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.06),_transparent_28%)]" />
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-20 bg-gradient-to-r from-black via-black/55 to-transparent lg:block" />
          <div className="relative z-10 flex w-full flex-col px-5 pb-8 pt-6 sm:px-8 sm:pb-10 sm:pt-8 lg:px-16 lg:py-14">
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
            <div className="mx-auto flex w-full max-w-[468px] flex-1 animate-fade-in flex-col justify-start">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

