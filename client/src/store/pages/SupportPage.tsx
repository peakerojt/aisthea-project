import React, { useState, useEffect } from 'react';
import { Header } from '@/store/components/Header';
import { ViewState, CategoryType } from '@/types';
import { ChevronRight, ShoppingBag, RefreshCw, ShieldCheck, HelpCircle, Mail, Phone, MapPin } from 'lucide-react';

export type SupportSection = 'how-to-buy' | 'returns' | 'privacy' | 'faq';

interface SupportPageProps {
    setView: (v: ViewState, id?: number) => void;
    setCategory: (c: CategoryType) => void;
    setSearchTerm: (term: string) => void;
    onProductClick: (product: any) => void;
    initialSection?: SupportSection;
}

const SECTIONS = [
    { key: 'how-to-buy' as SupportSection, label: 'Hướng dẫn mua hàng', icon: ShoppingBag },
    { key: 'returns' as SupportSection, label: 'Chính sách đổi trả', icon: RefreshCw },
    { key: 'privacy' as SupportSection, label: 'Chính sách bảo mật', icon: ShieldCheck },
    { key: 'faq' as SupportSection, label: 'Câu hỏi thường gặp', icon: HelpCircle },
];

// ── Content ──────────────────────────────────────────────────────────────────

const HowToBuy = () => (
    <div className="flex flex-col gap-8">
        <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-4">Hướng dẫn mua hàng</h2>
            <p className="text-gray-400 leading-relaxed">
                Mua sắm tại AISTHEA thật đơn giản — chỉ cần làm theo các bước sau.
            </p>
        </div>

        {[
            {
                step: '01', title: 'Tìm sản phẩm',
                body: 'Duyệt qua các danh mục Nam, Nữ hoặc dùng tính năng Tìm kiếm để tìm sản phẩm theo tên. Bạn cũng có thể vào "The Stylist" để xem các gợi ý outfit theo phong cách cá nhân.',
            },
            {
                step: '02', title: 'Chọn size & màu sắc',
                body: 'Trên trang chi tiết sản phẩm, chọn size và màu sắc phù hợp. Tham khảo bảng hướng dẫn size để có lựa chọn chính xác nhất.',
            },
            {
                step: '03', title: 'Thêm vào giỏ hàng',
                body: 'Nhấn nút "Thêm vào giỏ hàng". Bạn có thể tiếp tục mua sắm hoặc chuyển ngay đến giỏ hàng để thanh toán.',
            },
            {
                step: '04', title: 'Thanh toán',
                body: 'Tại trang giỏ hàng, nhấn "Tiến hành thanh toán". Điền thông tin giao hàng, chọn phương thức thanh toán (COD, VNPay, thẻ Visa/Mastercard) và xác nhận đơn hàng.',
            },
            {
                step: '05', title: 'Xác nhận & theo dõi',
                body: 'Bạn sẽ nhận email xác nhận đơn hàng. Theo dõi trạng thái giao hàng tại mục "Đơn hàng của tôi" trong tài khoản.',
            },
        ].map(({ step, title, body }) => (
            <div key={step} className="flex gap-6 border-l-2 border-white/10 pl-6 hover:border-primary transition-colors">
                <span className="text-4xl font-black text-white/10 leading-none shrink-0">{step}</span>
                <div>
                    <h3 className="text-white font-bold uppercase tracking-wide mb-2">{title}</h3>
                    <p className="text-gray-400 leading-relaxed text-sm">{body}</p>
                </div>
            </div>
        ))}
    </div>
);

const Returns = () => (
    <div className="flex flex-col gap-8">
        <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-4">Chính sách đổi trả</h2>
            <p className="text-gray-400 leading-relaxed">
                AISTHEA cam kết đổi/trả hàng trong vòng <strong className="text-white">7 ngày</strong> kể từ ngày nhận hàng.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
                { title: 'Điều kiện đổi trả', items: ['Sản phẩm còn nguyên tem, nhãn', 'Chưa qua sử dụng, giặt ủi', 'Còn hóa đơn mua hàng', 'Trong thời gian 7 ngày'] },
                { title: 'Không áp dụng cho', items: ['Sản phẩm đã qua sử dụng', 'Sản phẩm giảm giá trên 50%', 'Đồ lót, bít tất, phụ kiện', 'Hàng đặt theo yêu cầu riêng'] },
            ].map(({ title, items }) => (
                <div key={title} className="border border-white/10 p-6 rounded-sm">
                    <h3 className="text-white font-bold uppercase tracking-wide mb-4 text-sm">{title}</h3>
                    <ul className="flex flex-col gap-2">
                        {items.map(item => (
                            <li key={item} className="flex items-start gap-2 text-sm text-gray-400">
                                <ChevronRight size={14} className="text-primary shrink-0 mt-0.5" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>

        <div className="border border-white/10 p-6 rounded-sm">
            <h3 className="text-white font-bold uppercase tracking-wide mb-4 text-sm">Quy trình đổi/trả</h3>
            <div className="flex flex-col gap-3">
                {[
                    'Liên hệ AISTHEA qua email aisthea@gmail.com hoặc hotline 0999 999 999',
                    'Cung cấp mã đơn hàng và lý do đổi/trả',
                    'Gửi sản phẩm về địa chỉ kho hàng theo hướng dẫn',
                    'Hoàn tiền hoặc gửi sản phẩm mới trong 3–5 ngày làm việc',
                ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-gray-400">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 font-bold">{i + 1}</span>
                        {step}
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const Privacy = () => (
    <div className="flex flex-col gap-8">
        <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-4">Chính sách bảo mật</h2>
            <p className="text-gray-400 leading-relaxed">
                AISTHEA cam kết bảo vệ thông tin cá nhân của bạn. Chính sách này mô tả cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu.
            </p>
        </div>

        {[
            {
                title: 'Thông tin chúng tôi thu thập',
                content: 'Họ tên, địa chỉ email, số điện thoại, địa chỉ giao hàng, và thông tin thanh toán khi bạn đặt hàng. Chúng tôi cũng thu thập dữ liệu kỹ thuật như địa chỉ IP, loại thiết bị và hành vi duyệt web để cải thiện trải nghiệm.',
            },
            {
                title: 'Mục đích sử dụng',
                content: 'Thông tin của bạn được dùng để xử lý đơn hàng, giao hàng, hỗ trợ khách hàng và gửi thông tin khuyến mãi (nếu bạn đồng ý). Chúng tôi không bán thông tin cá nhân cho bên thứ ba.',
            },
            {
                title: 'Bảo mật dữ liệu',
                content: 'Dữ liệu được mã hóa SSL và lưu trữ trên máy chủ bảo mật. Chỉ nhân viên được ủy quyền mới có thể truy cập thông tin cá nhân của bạn.',
            },
            {
                title: 'Quyền của bạn',
                content: 'Bạn có quyền truy cập, chỉnh sửa hoặc xóa thông tin cá nhân bất kỳ lúc nào bằng cách liên hệ aisthea@gmail.com. Bạn cũng có thể hủy đăng ký nhận email marketing bất cứ lúc nào.',
            },
            {
                title: 'Cookie',
                content: 'Website sử dụng cookie để ghi nhớ giỏ hàng, tùy chọn và phân tích lưu lượng truy cập. Bạn có thể tắt cookie trong trình duyệt, nhưng một số chức năng có thể bị ảnh hưởng.',
            },
        ].map(({ title, content }) => (
            <div key={title} className="border-l-2 border-white/10 pl-6 hover:border-primary transition-colors">
                <h3 className="text-white font-bold uppercase tracking-wide mb-2 text-sm">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{content}</p>
            </div>
        ))}

        <p className="text-xs text-gray-600">Cập nhật lần cuối: Tháng 3, 2026</p>
    </div>
);

const FAQ = () => {
    const [open, setOpen] = useState<number | null>(null);
    const items = [
        { q: 'Tôi có thể đổi size sau khi đặt hàng không?', a: 'Có, bạn có thể yêu cầu đổi size trong vòng 7 ngày nhận hàng nếu sản phẩm còn nguyên tem, chưa qua sử dụng. Liên hệ hotline 0999 999 999 hoặc email aisthea@gmail.com để được hỗ trợ.' },
        { q: 'AISTHEA có ship toàn quốc không?', a: 'Có, chúng tôi giao hàng toàn quốc. Thời gian giao hàng từ 2–5 ngày làm việc với nội thành Đà Nẵng và 3–7 ngày với các tỉnh thành khác.' },
        { q: 'Phí ship như thế nào?', a: 'Miễn phí vận chuyển cho đơn hàng từ 500.000đ trở lên. Với đơn dưới 500.000đ, phí ship từ 25.000–35.000đ tùy khu vực.' },
        { q: 'Tôi có thể thanh toán bằng cách nào?', a: 'AISTHEA chấp nhận: thanh toán khi nhận hàng (COD), chuyển khoản ngân hàng, ví VNPay, thẻ Visa và Mastercard.' },
        { q: 'Làm thế nào để theo dõi đơn hàng?', a: 'Đăng nhập vào tài khoản, vào mục "Đơn hàng của tôi" để xem trạng thái đơn hàng và thông tin vận chuyển theo thời gian thực.' },
        { q: 'Sản phẩm của AISTHEA có bảo hành không?', a: 'AISTHEA bảo hành lỗi sản xuất trong 30 ngày kể từ ngày mua. Không áp dụng với hư hỏng do sử dụng không đúng cách.' },
        { q: 'Tôi quên mật khẩu, phải làm gì?', a: 'Nhấn "Quên mật khẩu" trên trang đăng nhập và nhập email của bạn. Chúng tôi sẽ gửi link đặt lại mật khẩu trong vài phút.' },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-4">Câu hỏi thường gặp</h2>
                <p className="text-gray-400 leading-relaxed">Những câu hỏi phổ biến nhất từ khách hàng.</p>
            </div>
            <div className="flex flex-col divide-y divide-white/5">
                {items.map((item, i) => (
                    <div key={i}>
                        <button
                            onClick={() => setOpen(open === i ? null : i)}
                            className="w-full flex justify-between items-center py-5 text-left group"
                        >
                            <span className={`text-sm font-semibold transition-colors ${open === i ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>{item.q}</span>
                            <ChevronRight
                                size={16}
                                className={`shrink-0 text-gray-500 transition-transform duration-300 ${open === i ? 'rotate-90 text-primary' : ''}`}
                            />
                        </button>
                        {open === i && (
                            <p className="text-sm text-gray-400 leading-relaxed pb-5 pr-8">{item.a}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const SupportPage: React.FC<SupportPageProps> = ({
    setView, setCategory, setSearchTerm, onProductClick, initialSection = 'how-to-buy',
}) => {
    const [active, setActive] = useState<SupportSection>(initialSection);

    useEffect(() => {
        setActive(initialSection);
    }, [initialSection]);


    const contentMap: Record<SupportSection, React.ReactNode> = {
        'how-to-buy': <HowToBuy />,
        'returns': <Returns />,
        'privacy': <Privacy />,
        'faq': <FAQ />,
    };

    return (
        <div className="flex flex-col w-full min-h-screen bg-bg-dark font-sans">
            <Header
                setView={setView}
                setCategory={setCategory}
                setSearchTerm={setSearchTerm}
                onProductClick={onProductClick}
                transparent={false}
            />

            {/* Breadcrumb */}
            <div className="border-b border-white/5 bg-[#0a0a0a]">
                <div className="container mx-auto px-6 md:px-12 py-4 flex items-center gap-2 text-xs text-gray-500">
                    <button onClick={() => setView('STORE_HOME')} className="hover:text-white transition-colors">Trang chủ</button>
                    <ChevronRight size={12} />
                    <span className="text-white">{SECTIONS.find(s => s.key === active)?.label}</span>
                </div>
            </div>

            <div className="container mx-auto px-6 md:px-12 py-16 flex flex-col lg:flex-row gap-12">

                {/* Sidebar */}
                <aside className="lg:w-64 shrink-0">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-4">Hỗ trợ</h3>
                    <nav className="flex flex-col gap-1">
                        {SECTIONS.map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                onClick={() => setActive(key)}
                                className={`flex items-center gap-3 px-4 py-3 text-sm text-left rounded-sm transition-all duration-200 ${active === key
                                    ? 'bg-white text-black font-bold'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Icon size={16} />
                                {label}
                            </button>
                        ))}
                    </nav>

                    {/* Contact block */}
                    <div className="mt-8 border border-white/10 p-5 rounded-sm">
                        <h4 className="text-xs font-black uppercase tracking-[0.15em] text-white mb-4">Liên hệ</h4>
                        <div className="flex flex-col gap-3 text-xs text-gray-400">
                            <a href="tel:+84999999999" className="flex items-center gap-2 hover:text-white transition-colors">
                                <Phone size={12} className="text-primary" /> 0999 999 999
                            </a>
                            <a href="mailto:aisthea@gmail.com" className="flex items-center gap-2 hover:text-white transition-colors">
                                <Mail size={12} className="text-primary" /> aisthea@gmail.com
                            </a>
                            <div className="flex items-start gap-2">
                                <MapPin size={12} className="text-primary mt-0.5 shrink-0" />
                                <span>Khu đô thị FPT City, Phường Hòa Hải, Quận Ngũ Hành Sơn, TP. Đà Nẵng</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Content area */}
                <main className="flex-1 min-w-0">
                    {contentMap[active]}
                </main>
            </div>
        </div>
    );
};

export default SupportPage;
