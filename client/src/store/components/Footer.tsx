import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Facebook, Instagram, Mail, MapPin, Phone, ArrowRight, ShieldCheck, CreditCard, CheckCircle } from 'lucide-react';

const CONTACT = {
  phone: '0999 999 999',
  email: 'aisthea@gmail.com',
};

const SOCIAL = [
  { label: 'Facebook', href: 'https://www.facebook.com/zuck/?locale=vi_VN', icon: Facebook },
  { label: 'Instagram', href: 'https://www.instagram.com/Zuck/', icon: Instagram },
];

interface QuickLink {
  labelKey: string;
  path: string;
}

export const Footer: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const nav = (path: string) => {
    navigate(path);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
  };

  const quickLinks: QuickLink[] = [
    { labelKey: 'footer.quickLinks.home', path: '/' },
    { labelKey: 'footer.quickLinks.products', path: '/collection' },
    { labelKey: 'footer.quickLinks.collection', path: '/collection' },
    { labelKey: 'footer.quickLinks.stylist', path: '/stylist' },
  ];

  const supportLinks: QuickLink[] = [
    { labelKey: 'footer.supportLinks.howToBuy', path: '/support?section=how-to-buy' },
    { labelKey: 'footer.supportLinks.returns', path: '/support?section=returns' },
    { labelKey: 'footer.supportLinks.privacy', path: '/support?section=privacy' },
    { labelKey: 'footer.supportLinks.faq', path: '/support?section=faq' },
  ];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setEmail('');
      setTimeout(() => setSubmitted(false), 3000);
    }, 800);
  };

  return (
    <footer className="bg-[#0f0f0f] text-gray-300 font-sans border-t border-white/10">
      <div className="container mx-auto px-6 py-16 md:px-12 lg:px-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          <div className="flex flex-col gap-6">
            <button
              onClick={() => nav('/')}
              className="text-3xl font-black tracking-widest uppercase text-white inline-block w-fit hover:text-primary transition-colors"
            >
              AISTHEA
            </button>
            <p className="text-sm leading-relaxed text-gray-400">
              {t('footer.about_desc')}
            </p>
            <div className="flex items-center gap-3 mt-2">
              {SOCIAL.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(`footer.social.${label.toLowerCase()}`)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-primary hover:text-white transition-all duration-300 text-gray-400"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">{t('footer.quick_links')}</h3>
            <ul className="flex flex-col gap-4">
              {quickLinks.map((link) => (
                <li key={link.labelKey}>
                  <button onClick={() => nav(link.path)} className="text-sm text-gray-400 hover:text-white transition-colors text-left">
                    {t(link.labelKey)}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">{t('footer.support')}</h3>
            <ul className="flex flex-col gap-4">
              {supportLinks.map((link) => (
                <li key={link.labelKey}>
                  <button onClick={() => nav(link.path)} className="text-sm text-gray-400 hover:text-white transition-colors text-left">
                    {t(link.labelKey)}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-6 lg:min-h-[24rem]">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">{t('footer.contact_newsletter')}</h3>

            <ul className="flex flex-col gap-4 text-sm text-gray-400">
              <li>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(t('footer.contact.address'))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 hover:text-white transition-colors"
                >
                  <MapPin size={16} className="mt-0.5 shrink-0 text-white/50" />
                  <span>{t('footer.contact.address')}</span>
                </a>
              </li>
              <li>
                <a href={`tel:+84${CONTACT.phone.replace(/^0/, '').replace(/\s/g, '')}`} className="flex items-center gap-3 hover:text-white transition-colors">
                  <Phone size={16} className="shrink-0 text-white/50" />
                  <span>{CONTACT.phone}</span>
                </a>
              </li>
              <li>
                <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-3 hover:text-white transition-colors">
                  <Mail size={16} className="shrink-0 text-white/50" />
                  <span>{CONTACT.email}</span>
                </a>
              </li>
            </ul>

            <p className="text-sm leading-relaxed text-gray-400">
              {t('footer.newsletter.copy')}
            </p>

            <div className="min-h-[56px]">
              {submitted ? (
                <div className="flex min-h-[56px] items-center gap-2 py-2 text-sm text-emerald-400">
                  <CheckCircle size={16} />
                  <span>{t('footer.newsletter.success')}</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe}>
                  <div className="relative flex items-center">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('footer.email_placeholder')}
                      required
                      disabled={loading}
                      className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-white/30 transition-colors pr-12 placeholder:text-gray-500 disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      aria-label={t('footer.newsletter.subscribeAria')}
                      className="absolute right-0 flex h-full items-center justify-center px-4 text-gray-400 transition-colors hover:text-white disabled:opacity-40"
                    >
                      {loading ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <ArrowRight size={18} />
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 bg-[#0a0a0a]">
        <div className="container mx-auto px-6 py-6 md:px-12 lg:px-24 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest">{t('footer.copyright')}</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-widest">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>{t('footer.secure_payment')}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 h-5 bg-white/10 rounded flex items-center justify-center">
                <CreditCard size={12} className="text-white/40" />
              </span>
              <span className="w-10 h-5 bg-white/10 rounded flex items-center justify-center text-[9px] font-bold text-white/50">VNPay</span>
              <span className="w-10 h-5 bg-white/10 rounded flex items-center justify-center text-[9px] font-bold text-white/50 italic">VISA</span>
              <span className="w-12 h-5 bg-white/10 rounded flex items-center justify-center text-[8px] font-bold text-white/50">Mastercard</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
