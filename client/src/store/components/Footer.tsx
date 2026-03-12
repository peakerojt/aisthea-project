import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Facebook, Instagram, MapPin, Phone, Mail, ArrowRight, ShieldCheck, CreditCard, CheckCircle } from 'lucide-react';
import { ViewState, CategoryType } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Cập nhật link mạng xã hội thực tế tại đây
// ─────────────────────────────────────────────────────────────────────────────
const CONTACT = {
    address: 'Khu đô thị FPT City, Phường Hòa Hải, Quận Ngũ Hành Sơn, TP. Đà Nẵng',
    phone: '0999 999 999',
    email: 'aisthea@gmail.com',
};

const SOCIAL = [
    { label: 'Facebook', href: 'https://www.facebook.com/zuck/?locale=vi_VN', icon: Facebook },
    { label: 'Instagram', href: 'https://www.instagram.com/Zuck/', icon: Instagram },
    {
        label: 'X (Twitter)',
        href: 'https://x.com/elonmusk',
        icon: (props: React.SVGProps<SVGSVGElement>) => (
            <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16} {...props}>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L2.25 2.25h6.838l4.265 5.638 4.892-5.638Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
        ),
    },
    {
        label: 'TikTok',
        href: 'https://www.tiktok.com/@kfcecuador/?lang=hu-HU',
        icon: (props: React.SVGProps<SVGSVGElement>) => (
            <svg viewBox="0 0 24 24" fill="currentColor" width={18} height={18} {...props}>
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.81a8.18 8.18 0 004.78 1.52V6.88a4.85 4.85 0 01-1.01-.19z" />
            </svg>
        ),
    },
];
// ─────────────────────────────────────────────────────────────────────────────

interface FooterProps {
    setView: (v: ViewState) => void;
    setCategory: (c: CategoryType) => void;
    setCollection: (c: string) => void;
    handleSupportClick?: (section: import('@/store/pages/SupportPage').SupportSection) => void;
}

// Quick links navigate inside the SPA
interface QuickLink {
    label: string;
    action: () => void;
}

export const Footer: React.FC<FooterProps> = ({ setView, setCategory, setCollection, handleSupportClick }) => {
    const { t } = useTranslation('common');
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const nav = (view: ViewState, scroll = true) => {
        setView(view);
        if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const QUICK_LINKS: QuickLink[] = [
        { label: 'Trang chủ', action: () => nav('STORE_HOME') },
        {
            label: 'Sản phẩm',
            action: () => { setCategory('All' as CategoryType); setCollection('All'); nav('STORE_COLLECTION'); }
        },
        { label: 'Bộ sưu tập', action: () => nav('STORE_COLLECTION') },
        { label: 'The Stylist', action: () => nav('STORE_STYLIST') },
    ];

    // Support links open the dedicated SupportPage with the correct section active
    const SUPPORT_LINKS: { label: string; action: () => void }[] = [
        { label: 'Hướng dẫn mua hàng', action: () => handleSupportClick && handleSupportClick('how-to-buy') },
        { label: 'Chính sách đổi trả', action: () => handleSupportClick && handleSupportClick('returns') },
        { label: 'Chính sách bảo mật', action: () => handleSupportClick && handleSupportClick('privacy') },
        { label: 'Câu hỏi thường gặp (FAQ)', action: () => handleSupportClick && handleSupportClick('faq') },
    ];

    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setLoading(true);
        // TODO: kết nối API newsletter thực tế
        setTimeout(() => {
            setLoading(false);
            setSubmitted(true);
            setEmail('');
            setTimeout(() => setSubmitted(false), 5000);
        }, 800);
    };

    return (
        <footer className="bg-[#0f0f0f] text-gray-300 font-sans border-t border-white/10 relative">
            {/* Toast notification */}
            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white text-black text-xs font-semibold px-5 py-3 rounded-sm shadow-xl animate-fade-in-up">
                    {toast}
                </div>
            )}
            <div className="container mx-auto px-6 py-16 md:px-12 lg:px-24">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">

                    {/* ── Cột 1: Về AISTHEA ── */}
                    <div className="flex flex-col gap-6">
                        <button
                            onClick={() => nav('STORE_HOME')}
                            className="text-3xl font-black tracking-widest uppercase text-white inline-block w-fit hover:text-primary transition-colors"
                        >
                            AISTHEA
                        </button>
                        <p className="text-sm leading-relaxed text-gray-400">
                            {t('footer.about_desc', 'Chúng tôi mang đến những thiết kế tinh tế, kết hợp giữa tính ứng dụng cao và vẻ đẹp vượt thời gian.')}
                        </p>
                        {/* Social icons */}
                        <div className="flex items-center gap-3 mt-2">
                            {SOCIAL.map(({ label, href, icon: Icon }) => (
                                <a
                                    key={label}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={label}
                                    title={label}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-primary hover:text-white transition-all duration-300 text-gray-400"
                                >
                                    <Icon />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* ── Cột 2: Liên kết nhanh ── */}
                    <div className="flex flex-col gap-6 lg:pl-8">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-white">
                            {t('footer.quick_links', 'Liên kết nhanh')}
                        </h3>
                        <ul className="flex flex-col gap-4">
                            {QUICK_LINKS.map(link => (
                                <li key={link.label}>
                                    <button
                                        onClick={link.action}
                                        className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1.5 group text-left"
                                    >
                                        <span className="w-0 group-hover:w-3 overflow-hidden transition-all duration-200 text-primary">›</span>
                                        {link.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* ── Cột 3: Hỗ trợ khách hàng ── */}
                    <div className="flex flex-col gap-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-white">
                            {t('footer.support', 'Hỗ trợ khách hàng')}
                        </h3>
                        <ul className="flex flex-col gap-4">
                            {SUPPORT_LINKS.map(link => (
                                <li key={link.label}>
                                    <button
                                        onClick={link.action}
                                        className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1.5 group text-left"
                                    >
                                        <span className="w-0 group-hover:w-3 overflow-hidden transition-all duration-200 text-primary">›</span>
                                        {link.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* ── Cột 4: Liên hệ & Bản tin ── */}
                    <div className="flex flex-col gap-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-white">
                            {t('footer.contact_newsletter', 'Liên hệ & Bản tin')}
                        </h3>

                        <ul className="flex flex-col gap-4 text-sm text-gray-400">
                            <li>
                                <a
                                    href={`https://maps.google.com/?q=${encodeURIComponent(CONTACT.address)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-start gap-3 hover:text-white transition-colors group"
                                >
                                    <MapPin size={16} className="mt-0.5 shrink-0 text-white/50 group-hover:text-primary transition-colors" />
                                    <span>{CONTACT.address}</span>
                                </a>
                            </li>
                            <li>
                                <a
                                    href={`tel:+84${CONTACT.phone.replace(/^0/, '').replace(/\s/g, '')}`}
                                    className="flex items-center gap-3 hover:text-white transition-colors group"
                                >
                                    <Phone size={16} className="shrink-0 text-white/50 group-hover:text-primary transition-colors" />
                                    <span>{CONTACT.phone}</span>
                                </a>
                            </li>
                            <li>
                                <a
                                    href={`mailto:${CONTACT.email}`}
                                    className="flex items-center gap-3 hover:text-white transition-colors group"
                                >
                                    <Mail size={16} className="shrink-0 text-white/50 group-hover:text-primary transition-colors" />
                                    <span>{CONTACT.email}</span>
                                </a>
                            </li>
                        </ul>

                        {/* Newsletter form */}
                        <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-3 uppercase tracking-widest">
                                {t('footer.newsletter_label', 'Nhận ưu đãi qua email')}
                            </p>
                            {submitted ? (
                                <div className="flex items-center gap-2 text-emerald-400 text-sm py-3">
                                    <CheckCircle size={16} />
                                    <span>Đăng ký thành công! Cảm ơn bạn.</span>
                                </div>
                            ) : (
                                <form onSubmit={handleSubscribe}>
                                    <div className="relative flex items-center">
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder={t('footer.email_placeholder', 'Nhập email của bạn...')}
                                            required
                                            disabled={loading}
                                            className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-white/30 transition-colors pr-12 placeholder:text-gray-500 disabled:opacity-60"
                                        />
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            aria-label="Đăng ký nhận tin"
                                            className="absolute right-0 h-full px-4 text-gray-400 hover:text-white transition-colors flex items-center justify-center disabled:opacity-40"
                                        >
                                            {loading
                                                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                : <ArrowRight size={18} />
                                            }
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Bottom bar ── */}
            <div className="border-t border-white/5 bg-[#0a0a0a]">
                <div className="container mx-auto px-6 py-6 md:px-12 lg:px-24 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-gray-500 uppercase tracking-widest">
                        {t('footer.copyright', '© 2026 AISTHEA. All rights reserved.')}
                    </p>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-widest">
                            <ShieldCheck size={14} className="text-emerald-500" />
                            <span>{t('footer.secure_payment', 'Thanh toán an toàn')}</span>
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
