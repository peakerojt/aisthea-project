import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '@/common/utils/api';
import { useTranslation } from 'react-i18next';

export const VNPayReturn: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'vnpayReturn' });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState(t('states.loadingMessage'));

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const data = await api.get<any>(`/api/vnpay/vnpay_return?${searchParams.toString()}`);

        if (data.message === 'Success' && data.code === '00') {
          setStatus('success');
          setMessage(t('states.successMessage'));
        } else {
          setStatus('failed');
          setMessage(t('states.failedMessage'));
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('failed');
        setMessage(t('states.errorMessage'));
      }
    };

    verifyPayment();
  }, [searchParams, t]);

  return (
    <div className="min-h-screen bg-bg-dark text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[50vh] bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none"></div>

      <div className="w-full max-w-xl bg-surface-dark border border-border-dark p-10 lg:p-14 rounded-sm shadow-2xl relative z-10 text-center animate-fade-in-up">
        {status === 'loading' && (
          <div className="mb-6">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        )}

        {status === 'success' && (
          <div className="w-20 h-20 rounded-full border-4 border-green-500/30 flex items-center justify-center bg-green-500/10 shadow-[0_0_30px_rgba(34,197,94,0.1)] mx-auto mb-6">
            <span className="material-symbols-outlined text-green-500 text-5xl">check_circle</span>
          </div>
        )}

        {status === 'failed' && (
          <div className="w-20 h-20 rounded-full border-4 border-red-500/30 flex items-center justify-center bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.1)] mx-auto mb-6">
            <span className="material-symbols-outlined text-red-500 text-5xl">cancel</span>
          </div>
        )}

        <h2 className="text-2xl font-bold mb-4">{message}</h2>
        <p className="text-gray-400 text-sm mb-10">
          {status === 'success' ? t('descriptions.success') : t('descriptions.failed')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-8 h-12 bg-primary text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-colors rounded-sm"
          >
            {t('actions.continueShopping')}
          </button>
          <button
            onClick={() => navigate('/', { state: { initialView: 'STORE_MY_ORDERS' } })}
            className="px-8 h-12 border border-border-dark text-gray-300 font-bold text-xs uppercase tracking-widest hover:border-white hover:text-white transition-colors rounded-sm"
          >
            {t('actions.manageOrders')}
          </button>
        </div>
      </div>
    </div>
  );
};
