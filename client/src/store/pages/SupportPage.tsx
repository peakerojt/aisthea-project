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
  const { t: rawT } = useTranslation('pages', { keyPrefix: 'support' });
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionFromQuery = searchParams.get('section');
  const initialSection: SupportSection = isSupportSection(sectionFromQuery) ? sectionFromQuery : 'how-to-buy';
  const [active, setActive] = useState<SupportSection>(initialSection);

  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const value = rawT(key, {
      ...(options ?? {}),
      defaultValue: fallback,
    });

    return value === key ? interpolateFallback(fallback, options) : value;
  };

  useEffect(() => {
    setActive(initialSection);
  }, [initialSection]);

  const sections = useMemo(
    () => [
      { key: 'how-to-buy' as const, label: resolveText('sections.howToBuy', 'Hướng dẫn mua hàng'), icon: ShoppingBag },
      { key: 'returns' as const, label: resolveText('sections.returns', 'Chính sách đổi trả'), icon: RefreshCw },
      { key: 'privacy' as const, label: resolveText('sections.privacy', 'Chính sách bảo mật'), icon: ShieldCheck },
      { key: 'faq' as const, label: resolveText('sections.faq', 'Câu hỏi thường gặp'), icon: HelpCircle },
    ],
    [resolveText],
  );

  const homeLabel = resolveText('breadcrumbs.home', 'Trang chủ');
  const sidebarTitle = resolveText('sidebar.title', 'Hỗ trợ');
  const contactTitle = resolveText('contact.title', 'Liên hệ');
  const contactAddress = resolveText(
    'contact.address',
    'Khu đô thị FPT City, Phường Hòa Hải, Quận Ngũ Hành Sơn, TP. Đà Nẵng',
  );
  const howToBuyTitle = resolveText('content.howToBuy.title', 'Hướng dẫn mua hàng');
  const howToBuySteps = [
    resolveText('content.howToBuy.steps.1', 'Tìm sản phẩm theo danh mục hoặc ô tìm kiếm.'),
    resolveText('content.howToBuy.steps.2', 'Chọn màu, size và số lượng phù hợp.'),
    resolveText('content.howToBuy.steps.3', 'Thêm vào giỏ hàng và thanh toán.'),
    resolveText('content.howToBuy.steps.4', 'Theo dõi đơn hàng trong trang tài khoản.'),
  ];
  const returnsTitle = resolveText('content.returns.title', 'Chính sách đổi trả');
  const returnsDescription1 = resolveText(
    'content.returns.description1',
    'Hỗ trợ đổi/trả trong vòng 7 ngày nếu sản phẩm còn nguyên tem và chưa qua sử dụng.',
  );
  const returnsDescription2 = resolveText(
    'content.returns.description2',
    'Vui lòng liên hệ hotline hoặc email để được hướng dẫn quy trình trả hàng.',
  );
  const privacyTitle = resolveText('content.privacy.title', 'Chính sách bảo mật');
  const privacyDescription1 = resolveText(
    'content.privacy.description1',
    'Thông tin cá nhân được sử dụng để xử lý đơn hàng và chăm sóc khách hàng.',
  );
  const privacyDescription2 = resolveText(
    'content.privacy.description2',
    'Hệ thống áp dụng bảo mật và không chia sẻ thông tin cho bên thứ ba không liên quan.',
  );
  const faqTitle = resolveText('content.faq.title', 'Câu hỏi thường gặp');
  const faqQ1Label = resolveText('content.faq.q1Label', 'Hỏi:');
  const faqQ1Question = resolveText('content.faq.q1Question', 'Có giao hàng toàn quốc không?');
  const faqA1Label = resolveText('content.faq.a1Label', 'Đáp:');
  const faqA1Answer = resolveText('content.faq.a1Answer', 'Có, thời gian giao từ 2-7 ngày tùy khu vực.');
  const faqQ2Label = resolveText('content.faq.q2Label', 'Hỏi:');
  const faqQ2Question = resolveText('content.faq.q2Question', 'Có những hình thức thanh toán nào?');
  const faqA2Label = resolveText('content.faq.a2Label', 'Đáp:');
  const faqA2Answer = resolveText('content.faq.a2Answer', 'COD, chuyển khoản, VNPay, Visa/Mastercard.');

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
            {homeLabel}
          </button>
          <ChevronRight size={12} />
          <span className="text-white">{sections.find((s) => s.key === active)?.label}</span>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-12 py-16 flex flex-col lg:flex-row gap-12">
        <aside className="lg:w-64 shrink-0">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-4">{sidebarTitle}</h3>
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
            <h4 className="text-xs font-black uppercase tracking-[0.15em] text-white mb-4">{contactTitle}</h4>
            <div className="flex flex-col gap-3 text-xs text-gray-400">
              <a href="tel:+84999999999" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone size={12} className="text-primary" /> 0999 999 999
              </a>
              <a href="mailto:aisthea@gmail.com" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail size={12} className="text-primary" /> aisthea@gmail.com
              </a>
              <div className="flex items-start gap-2">
                <MapPin size={12} className="text-primary mt-0.5 shrink-0" />
                <span>{contactAddress}</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {active === 'how-to-buy' && (
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">{howToBuyTitle}</h2>
              <ol className="list-decimal pl-5 space-y-2">
                {howToBuySteps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {active === 'returns' && (
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">{returnsTitle}</h2>
              <p>{returnsDescription1}</p>
              <p>{returnsDescription2}</p>
            </div>
          )}

          {active === 'privacy' && (
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">{privacyTitle}</h2>
              <p>{privacyDescription1}</p>
              <p>{privacyDescription2}</p>
            </div>
          )}

          {active === 'faq' && (
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">{faqTitle}</h2>
              <p>
                <strong>{faqQ1Label}</strong> {faqQ1Question}
                <br />
                <strong>{faqA1Label}</strong> {faqA1Answer}
              </p>
              <p>
                <strong>{faqQ2Label}</strong> {faqQ2Question}
                <br />
                <strong>{faqA2Label}</strong> {faqA2Answer}
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
