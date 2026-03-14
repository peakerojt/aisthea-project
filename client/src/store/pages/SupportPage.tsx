import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, HelpCircle, Mail, MapPin, Phone, RefreshCw, ShieldCheck, ShoppingBag } from 'lucide-react';
import { ChatWidget } from '@/common/components/ChatWidget';
import { Header } from '@/store/components/Header';
import { useTranslation } from 'react-i18next';

export type SupportSection = 'how-to-buy' | 'returns' | 'privacy' | 'faq';

const isSupportSection = (value: string | null): value is SupportSection =>
  value === 'how-to-buy' || value === 'returns' || value === 'privacy' || value === 'faq';

export const SupportPage: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'support' });
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionFromQuery = searchParams.get('section');
  const initialSection: SupportSection = isSupportSection(sectionFromQuery) ? sectionFromQuery : 'how-to-buy';
  const [active, setActive] = useState<SupportSection>(initialSection);

  useEffect(() => {
    setActive(initialSection);
  }, [initialSection]);

  const sections = useMemo(
    () => [
      { key: 'how-to-buy' as const, label: t('sections.howToBuy'), icon: ShoppingBag },
      { key: 'returns' as const, label: t('sections.returns'), icon: RefreshCw },
      { key: 'privacy' as const, label: t('sections.privacy'), icon: ShieldCheck },
      { key: 'faq' as const, label: t('sections.faq'), icon: HelpCircle },
    ],
    [t],
  );

  const handleSectionChange = (section: SupportSection) => {
    setActive(section);
    setSearchParams({ section });
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-bg-dark font-sans">
      <Header transparent={false} />

      <div className="border-b border-white/5 bg-[#0a0a0a]">
        <div className="container mx-auto px-6 md:px-12 py-4 flex items-center gap-2 text-xs text-gray-500">
          <button onClick={() => navigate('/')} className="hover:text-white transition-colors">
            {t('breadcrumbs.home')}
          </button>
          <ChevronRight size={12} />
          <span className="text-white">{sections.find((s) => s.key === active)?.label}</span>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-12 py-16 flex flex-col lg:flex-row gap-12">
        <aside className="lg:w-64 shrink-0">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-4">{t('sidebar.title')}</h3>
          <nav className="flex flex-col gap-1">
            {sections.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleSectionChange(key)}
                className={`flex items-center gap-3 px-4 py-3 text-sm text-left rounded-sm transition-all duration-200 ${
                  active === key ? 'bg-white text-black font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-8 border border-white/10 p-5 rounded-sm">
            <h4 className="text-xs font-black uppercase tracking-[0.15em] text-white mb-4">{t('contact.title')}</h4>
            <div className="flex flex-col gap-3 text-xs text-gray-400">
              <a href="tel:+84999999999" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone size={12} className="text-primary" /> 0999 999 999
              </a>
              <a href="mailto:aisthea@gmail.com" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail size={12} className="text-primary" /> aisthea@gmail.com
              </a>
              <div className="flex items-start gap-2">
                <MapPin size={12} className="text-primary mt-0.5 shrink-0" />
                <span>{t('contact.address')}</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {active === 'how-to-buy' && (
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">{t('content.howToBuy.title')}</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>{t('content.howToBuy.steps.1')}</li>
                <li>{t('content.howToBuy.steps.2')}</li>
                <li>{t('content.howToBuy.steps.3')}</li>
                <li>{t('content.howToBuy.steps.4')}</li>
              </ol>
            </div>
          )}

          {active === 'returns' && (
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">{t('content.returns.title')}</h2>
              <p>{t('content.returns.description1')}</p>
              <p>{t('content.returns.description2')}</p>
            </div>
          )}

          {active === 'privacy' && (
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">{t('content.privacy.title')}</h2>
              <p>{t('content.privacy.description1')}</p>
              <p>{t('content.privacy.description2')}</p>
            </div>
          )}

          {active === 'faq' && (
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">{t('content.faq.title')}</h2>
              <p>
                <strong>{t('content.faq.q1Label')}</strong> {t('content.faq.q1Question')}
                <br />
                <strong>{t('content.faq.a1Label')}</strong> {t('content.faq.a1Answer')}
              </p>
              <p>
                <strong>{t('content.faq.q2Label')}</strong> {t('content.faq.q2Question')}
                <br />
                <strong>{t('content.faq.a2Label')}</strong> {t('content.faq.a2Answer')}
              </p>
            </div>
          )}
        </main>
      </div>

      <ChatWidget page="support" />
    </div>
  );
};

export default SupportPage;
