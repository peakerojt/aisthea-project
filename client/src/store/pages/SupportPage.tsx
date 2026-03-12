import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, HelpCircle, Mail, MapPin, Phone, RefreshCw, ShieldCheck, ShoppingBag } from 'lucide-react';
import { Header } from '@/store/components/Header';

export type SupportSection = 'how-to-buy' | 'returns' | 'privacy' | 'faq';

const SECTIONS: { key: SupportSection; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: 'how-to-buy', label: 'Huong dan mua hang', icon: ShoppingBag },
  { key: 'returns', label: 'Chinh sach doi tra', icon: RefreshCw },
  { key: 'privacy', label: 'Chinh sach bao mat', icon: ShieldCheck },
  { key: 'faq', label: 'Cau hoi thuong gap', icon: HelpCircle },
];

const isSupportSection = (value: string | null): value is SupportSection =>
  value === 'how-to-buy' || value === 'returns' || value === 'privacy' || value === 'faq';

const sectionContent: Record<SupportSection, React.ReactNode> = {
  'how-to-buy': (
    <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
      <h2 className="text-2xl font-black uppercase tracking-tight text-white">Huong dan mua hang</h2>
      <ol className="list-decimal pl-5 space-y-2">
        <li>Tim san pham theo danh muc hoac o tim kiem.</li>
        <li>Chon mau, size va so luong phu hop.</li>
        <li>Them vao gio hang va thanh toan.</li>
        <li>Theo doi don hang trong trang tai khoan.</li>
      </ol>
    </div>
  ),
  returns: (
    <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
      <h2 className="text-2xl font-black uppercase tracking-tight text-white">Chinh sach doi tra</h2>
      <p>Ho tro doi/tra trong vong 7 ngay neu san pham con nguyen tem va chua qua su dung.</p>
      <p>Vui long lien he hotline hoac email de duoc huong dan quy trinh tra hang.</p>
    </div>
  ),
  privacy: (
    <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
      <h2 className="text-2xl font-black uppercase tracking-tight text-white">Chinh sach bao mat</h2>
      <p>Thong tin ca nhan duoc su dung de xu ly don hang va cham soc khach hang.</p>
      <p>He thong ap dung bao mat va khong chia se thong tin cho ben thu ba khong lien quan.</p>
    </div>
  ),
  faq: (
    <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
      <h2 className="text-2xl font-black uppercase tracking-tight text-white">Cau hoi thuong gap</h2>
      <p><strong>Hoi:</strong> Co giao hang toan quoc khong? <br /><strong>Dap:</strong> Co, thoi gian giao tu 2-7 ngay tuy khu vuc.</p>
      <p><strong>Hoi:</strong> Co nhung hinh thuc thanh toan nao? <br /><strong>Dap:</strong> COD, chuyen khoan, VNPay, Visa/Mastercard.</p>
    </div>
  ),
};

export const SupportPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionFromQuery = searchParams.get('section');
  const initialSection: SupportSection = isSupportSection(sectionFromQuery) ? sectionFromQuery : 'how-to-buy';
  const [active, setActive] = useState<SupportSection>(initialSection);

  useEffect(() => {
    setActive(initialSection);
  }, [initialSection]);

  const handleSectionChange = (section: SupportSection) => {
    setActive(section);
    setSearchParams({ section });
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-bg-dark font-sans">
      <Header transparent={false} />

      <div className="border-b border-white/5 bg-[#0a0a0a]">
        <div className="container mx-auto px-6 md:px-12 py-4 flex items-center gap-2 text-xs text-gray-500">
          <button onClick={() => navigate('/')} className="hover:text-white transition-colors">Trang chu</button>
          <ChevronRight size={12} />
          <span className="text-white">{SECTIONS.find((s) => s.key === active)?.label}</span>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-12 py-16 flex flex-col lg:flex-row gap-12">
        <aside className="lg:w-64 shrink-0">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-4">Ho tro</h3>
          <nav className="flex flex-col gap-1">
            {SECTIONS.map(({ key, label, icon: Icon }) => (
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
            <h4 className="text-xs font-black uppercase tracking-[0.15em] text-white mb-4">Lien he</h4>
            <div className="flex flex-col gap-3 text-xs text-gray-400">
              <a href="tel:+84999999999" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone size={12} className="text-primary" /> 0999 999 999
              </a>
              <a href="mailto:aisthea@gmail.com" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail size={12} className="text-primary" /> aisthea@gmail.com
              </a>
              <div className="flex items-start gap-2">
                <MapPin size={12} className="text-primary mt-0.5 shrink-0" />
                <span>Khu do thi FPT City, Phuong Hoa Hai, Quan Ngu Hanh Son, TP. Da Nang</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">{sectionContent[active]}</main>
      </div>
    </div>
  );
};

export default SupportPage;
