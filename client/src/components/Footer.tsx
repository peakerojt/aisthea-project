import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Facebook, Instagram, Twitter, MapPin, Phone, Mail, ArrowRight, ShieldCheck, CreditCard } from 'lucide-react';

// ─── Constants for Links ────────────────────────────────────────────────────────

export interface FooterLink {
    label: string;
    href: string;
}

export const QUICK_LINKS: FooterLink[] = [
    { label: 'Trang chủ', href: '/' },
    { label: 'Sản phẩm', href: '/products' },
    { label: 'Bộ sưu tập', href: '/collections' },
    { label: 'Bài viết/Blog', href: '/blog' },
];

export const SUPPORT_LINKS: FooterLink[] = [
    { label: 'Hướng dẫn mua hàng', href: '/support/how-to-buy' },
    { label: 'Chính sách đổi trả', href: '/support/returns' },
    { label: 'Chính sách bảo mật', href: '/support/privacy' },
    { label: 'Câu hỏi thường gặp (FAQ)', href: '/support/faq' },
];

export const SOCIAL_LINKS = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Twitter, href: '#', label: 'Twitter' },
];

// ─── Main Component ───────────────────────────────────────────────────

export const Footer: React.FC = () => {
    const { t } = useTranslation('common'); // Translation hook setup

    return (
        <footer className="bg-[#0f0f0f] text-gray-300 font-sans border-t border-white/10">
            <div className="container mx-auto px-6 py-16 md:px-12 lg:px-24">
                {/* Main Grid: 1 col on Mobile, 2 on Tablet, 4 on Desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">

                    {/* Column 1: About AISTHEA */}
                    <div className="flex flex-col gap-6">
                        <Link to="/" className="text-3xl font-black tracking-widest uppercase text-white hover:text-gray-200 transition-colors inline-block w-fit">
                            AISTHEA
                        </Link>
                        <p className="text-sm leading-relaxed text-gray-400">
                            {t('footer.about_desc', 'Chúng tôi mang đến những thiết kế tinh tế, kết hợp giữa tính ứng dụng cao và vẻ đẹp vượt thời gian, định hình lại chuẩn mực của sự thanh lịch hiện đại.')}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                            {SOCIAL_LINKS.map((social, idx) => {
                                const Icon = social.icon;
                                return (
                                    <a
                                        key={idx}
                                        href={social.href}
                                        aria-label={social.label}
                                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-primary hover:text-white transition-all duration-300 text-gray-400"
                                    >
                                        <Icon size={18} strokeWidth={2} />
                                    </a>
                                );
                            })}
                        </div>
                    </div>

                    {/* Column 2: Quick Links */}
                    <div className="flex flex-col gap-6 lg:pl-8">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-white">{t('footer.quick_links', 'Liên kết nhanh')}</h3>
                        <ul className="flex flex-col gap-4">
                            {QUICK_LINKS.map((link, idx) => (
                                <li key={idx}>
                                    <Link
                                        to={link.href}
                                        className="text-sm text-gray-400 hover:text-white transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-[1px] after:bg-white after:transition-all hover:after:w-full inline-block w-fit"
                                    >
                                        {t(`footer.links.${link.label}`, link.label)}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 3: Customer Support */}
                    <div className="flex flex-col gap-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-white">{t('footer.support', 'Hỗ trợ khách hàng')}</h3>
                        <ul className="flex flex-col gap-4">
                            {SUPPORT_LINKS.map((link, idx) => (
                                <li key={idx}>
                                    <Link
                                        to={link.href}
                                        className="text-sm text-gray-400 hover:text-white transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-[1px] after:bg-white after:transition-all hover:after:w-full inline-block w-fit"
                                    >
                                        {t(`footer.links.${link.label}`, link.label)}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 4: Contact & Newsletter */}
                    <div className="flex flex-col gap-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-white">{t('footer.contact_newsletter', 'Liên hệ & Bản tin')}</h3>

                        <ul className="flex flex-col gap-4 text-sm text-gray-400 mb-2">
                            <li className="flex items-start gap-3">
                                <MapPin size={16} className="mt-0.5 shrink-0 text-white/50" />
                                <span>123 Đường Điện Biên Phủ, Quận Thanh Khê, TP. Đà Nẵng</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone size={16} className="shrink-0 text-white/50" />
                                <span>0236 3123 456</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail size={16} className="shrink-0 text-white/50" />
                                <span>contact@aisthea.vn</span>
                            </li>
                        </ul>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                // Handle newsletter subscription
                                alert('Đăng ký nhận bản tin thành công!');
                            }}
                            className="mt-2"
                        >
                            <div className="relative flex items-center">
                                <input
                                    type="email"
                                    placeholder={t('footer.email_placeholder', 'Nhập email của bạn...')}
                                    required
                                    className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-white/30 transition-colors pr-12 placeholder:text-gray-500"
                                />
                                <button
                                    type="submit"
                                    aria-label="Đăng ký nhận tin"
                                    className="absolute right-0 h-full px-4 text-gray-400 hover:text-white transition-colors flex items-center justify-center bg-transparent border-none cursor-pointer"
                                >
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </form>
                    </div>

                </div>
            </div>

            {/* Bottom Bar */}
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
                            {/* Placeholder Icons for Payment */}
                            <span className="w-8 h-5 bg-white/10 rounded flex items-center justify-center pointer-events-none">
                                <CreditCard size={12} className="text-white/40" />
                            </span>
                            <span className="w-8 h-5 bg-white/10 rounded flex items-center justify-center text-[8px] font-bold text-white/50 pointer-events-none">
                                VNPay
                            </span>
                            <span className="w-8 h-5 bg-white/10 rounded flex items-center justify-center text-[8px] font-bold text-white/50 pointer-events-none italic">
                                VISA
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
