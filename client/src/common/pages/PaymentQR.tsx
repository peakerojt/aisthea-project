import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '@/common/contexts/CartContext';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';

const PaymentQR: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'paymentQR' });
  const navigate = useNavigate();
  const location = useLocation();
  const { cartTotal } = useCart();
  const stateTotal = (location.state as { totalAmount?: number } | null)?.totalAmount;
  const totalAmount = typeof stateTotal === 'number' ? stateTotal : cartTotal;

  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const resolveText = (key: string, fallback: string) => {
    const value = t(key, { defaultValue: fallback });
    return value === key ? fallback : value;
  };

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const banks = [
    { name: 'Vietcombank', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Vietcombank_Logo.svg/1024px-Vietcombank_Logo.svg.png' },
    { name: 'BIDV', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/BIDV_Logo.svg/1200px-BIDV_Logo.svg.png' },
    { name: 'VietinBank', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/VietinBank_Logo.svg/1024px-VietinBank_Logo.svg.png' },
    { name: 'Agribank', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Agribank_Logo.svg/1024px-Agribank_Logo.svg.png' },
    { name: 'SCB', url: 'https://cdn.haitrieu.com/wp-content/uploads/2022/01/Logo-SCB-Ngang.png' },
    { name: 'HDBank', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/HDBank_logo.svg/1024px-HDBank_logo.svg.png' },
    { name: 'BAOVIET Bank', url: 'https://baovietbank.vn/Data/Sites/1/media/logo.png' },
    { name: 'MSB', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Maritime_Bank.svg/1024px-Maritime_Bank.svg.png' },
    { name: 'VIB', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/VIB_logo.svg/1024px-VIB_logo.svg.png' },
    { name: 'Sacombank', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Sacombank_logo.svg/1024px-Sacombank_logo.svg.png' },
    { name: 'OCEAN BANK', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Logo_OceanbBank.png/1024px-Logo_OceanbBank.png' },
    { name: 'PVcomBank', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/PVcomBank_logo.svg/1024px-PVcomBank_logo.svg.png' },
    { name: 'IVB', url: 'https://indovinabank.com.vn/sites/default/files/IVB%20Logo.png' },
    { name: 'TPBank', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Logo_TPBank.svg/1024px-Logo_TPBank.svg.png' },
    { name: 'MB', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/MB_logo.svg/1024px-MB_logo.svg.png' },
    { name: 'Viet Capital', url: 'https://thangnhomrut1.com/wp-content/uploads/2021/05/logo-viet-capital-bank-ngang-ban-viet-1.png' },
  ];

  return (
    <div className="min-h-screen bg-bg-dark text-white font-sans relative overflow-x-hidden flex flex-col">
      <header className="border-b border-border-dark bg-surface-dark/50 shrink-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 border-r border-border-dark pr-4">
            <div className="bg-white px-2 py-1 flex items-center justify-center rounded">
              <div className="flex items-center select-none" style={{ fontFamily: 'Arial, sans-serif' }}>
                <span className="text-[#ed1c24] font-black italic text-lg leading-none tracking-tighter">VN</span>
                <span className="text-[#005a9c] font-black italic text-lg leading-none tracking-tighter">PAY</span>
                <sup className="text-[#ed1c24] font-bold text-[8px] relative -top-2 ml-[1px]">QR</sup>
              </div>
            </div>
          </div>
          <div className="flex-1 px-4">
            <h1 className="text-base md:text-lg font-bold text-gray-100 uppercase tracking-wide">
              {resolveText('header.title', 'Thanh toán bằng mã QR')}
            </h1>
          </div>
          <button
            onClick={() => navigate('/checkout')}
            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-xs font-medium whitespace-nowrap px-3 py-1 border border-blue-500/30 rounded hover:bg-blue-500/10"
          >
            <ArrowLeft className="size-3.5" />
            {resolveText('header.changeMethod', 'Đổi phương thức')}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col lg:flex-row gap-8 lg:gap-16 justify-center items-center lg:items-start py-6 w-full animate-fade-in-up">
        <div className="flex-1 flex flex-col items-center w-full max-w-sm">
          <div className="w-56 h-56 bg-white shadow-[0_0_20px_rgba(0,0,0,0.5)] p-3 rounded-lg flex items-center justify-center mb-6 relative">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=Aisthea_${totalAmount}`}
              alt={resolveText('left.qrAlt', 'Mã QR thanh toán')}
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 bg-white rounded flex items-center justify-center shadow-md p-1 border border-gray-200">
                <span className="font-serif font-black text-[9px] tracking-widest text-[#111]">A S T</span>
              </div>
            </div>
          </div>

          <div className="text-center mb-6">
            <p className="text-gray-400 mb-1 text-sm uppercase tracking-widest">
              {resolveText('left.totalLabel', 'Tổng thanh toán')}
            </p>
            <p className="text-3xl font-black text-white tracking-tight">
              {new Intl.NumberFormat('vi-VN').format(totalAmount)}
              <span className="text-xl inline-block align-top underline underline-offset-2 ml-1">đ</span>
            </p>
          </div>

          <div className="bg-[#fff9e6] border border-[#ffe082] rounded py-3 px-5 w-full flex items-center justify-between shadow-lg shadow-yellow-900/10">
            <span className="text-gray-800 font-medium text-sm">
              {resolveText('left.expireLabel', 'Thời gian còn lại')}
            </span>
            <div className="flex items-center gap-1 font-mono font-bold text-lg">
              <span className="bg-[#f59e0b] text-white px-1.5 py-0.5 rounded shadow-sm min-w-[32px] text-center">{minutes.toString().padStart(2, '0')}</span>
              <span className="font-black text-[#f59e0b]">:</span>
              <span className="bg-[#f59e0b] text-white px-1.5 py-0.5 rounded shadow-sm min-w-[32px] text-center">{seconds.toString().padStart(2, '0')}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full max-w-md pt-2">
          <h2 className="text-lg font-bold text-white mb-5 tracking-wide">
            {resolveText('right.title', 'Hướng dẫn thanh toán')}
          </h2>

          <ul className="space-y-4 text-gray-300 font-medium mb-8 text-sm">
            <li className="flex gap-4 items-start">
              <span className="text-gray-500 font-bold">1.</span>
              <p>
                <button className="text-blue-400 hover:text-blue-300 transition-colors font-semibold">
                  {resolveText('right.steps.download', 'Tải ứng dụng')}
                </button>{' '}
                {resolveText('right.steps.step1', 'ngân hàng hoặc ví điện tử hỗ trợ VietQR.')}
              </p>
            </li>
            <li className="flex gap-4 items-start">
              <span className="text-gray-500 font-bold">2.</span>
              <p>{resolveText('right.steps.step2', 'Mở ứng dụng và chọn tính năng quét mã QR.')}</p>
            </li>
            <li className="flex gap-4 items-start">
              <span className="text-gray-500 font-bold">3.</span>
              <p>{resolveText('right.steps.step3', 'Quét mã và kiểm tra thông tin thanh toán.')}</p>
            </li>
            <li className="flex gap-4 items-start">
              <span className="text-gray-500 font-bold">4.</span>
              <p>{resolveText('right.steps.step4', 'Xác nhận giao dịch để hoàn tất đơn hàng.')}</p>
            </li>
          </ul>

          <div>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {resolveText('right.supportedBanks', 'Ngân hàng hỗ trợ')}
              </h3>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-xl grid grid-cols-4 gap-4 gap-y-5 border border-gray-200">
              {banks.map((bank) => (
                <div key={bank.name} className="h-6 hover:scale-110 cursor-pointer flex items-center justify-center transition-transform group relative">
                  <img
                    src={bank.url}
                    alt={bank.name}
                    className="max-h-full max-w-full object-contain filter grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <span className="absolute -bottom-5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity text-[9px] text-gray-700 font-bold whitespace-nowrap bg-white/90 px-1 py-0.5 rounded shadow z-10">
                    {bank.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 w-full flex justify-end">
            <button
              onClick={() => navigate('/order-success')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded px-6 py-3 text-xs uppercase tracking-widest transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]"
            >
              {resolveText('actions.scannedContinue', 'Tôi đã quét xong')}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PaymentQR;
