import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingBag } from 'lucide-react';
import { NotificationBell } from '@/admin/components/NotificationBell';
import {
  AdminPageHeader,
  AdminPageShell,
  AdminTabs,
} from '@/admin/components/AdminUI';
import { DashboardCards } from '@/admin/components/DashboardCards';
import { RevenueChart } from '@/admin/components/RevenueChart';
import { TopProducts } from '@/admin/components/TopProducts';
import { RecentOrders } from '@/admin/components/RecentOrders';
import {
  fetchDashboardSummary,
  DashboardRange,
  DashboardSummary,
  DashboardKPIs,
} from '@/common/services/dashboard.service';
import { NewOrderPayload, useAdminSocket } from '@/admin/hooks/useAdminSocket';

interface ToastProps {
  title: string;
  message: string;
  visible: boolean;
}

const NewOrderToast: React.FC<ToastProps> = ({ title, message, visible }) => (
  <div
    className={`
      fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-500/40
      bg-[#0d1117] px-4 py-3 shadow-[0_0_24px_rgba(16,185,129,0.25)]
      transition-transform transition-opacity duration-500
      ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}
    `}
  >
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/15">
      <ShoppingBag className="h-4 w-4 text-emerald-400" />
    </div>
    <div>
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">{title}</p>
      <p className="text-sm font-semibold text-white">{message}</p>
    </div>
    <span className="ml-2 h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
  </div>
);

export const Dashboard: React.FC = () => {
  const { t } = useTranslation('dashboard');
  const rangeOptions: { value: DashboardRange; label: string }[] = [
    { value: 'today', label: t('range.today') },
    { value: 'week', label: t('range.week') },
    { value: 'month', label: t('range.month') },
    { value: 'year', label: t('range.year') },
  ];

  const [range, setRange] = useState<DashboardRange>('month');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveOrdersDelta, setLiveOrdersDelta] = useState(0);
  const [liveRevenueDelta, setLiveRevenueDelta] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const summaryCacheRef = useRef<Partial<Record<DashboardRange, DashboardSummary>>>({});
  const requestIdRef = useRef(0);

  const showToast = () => {
    setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 4000);
  };

  const handleNewOrder = useCallback((payload: NewOrderPayload) => {
    setLiveOrdersDelta((prev) => prev + 1);
    setLiveRevenueDelta((prev) => prev + payload.totalAmount);
    showToast();
  }, []);

  useAdminSocket(handleNewOrder);

  const load = useCallback(async (nextRange: DashboardRange) => {
    const cachedSummary = summaryCacheRef.current[nextRange];
    const requestId = ++requestIdRef.current;
    const isFirstLoad = summary === null && !cachedSummary;

    if (cachedSummary) {
      setSummary(cachedSummary);
      setIsLoading(false);
      setIsRefreshing(true);
    } else if (isFirstLoad) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setError(null);
    setLiveOrdersDelta(0);
    setLiveRevenueDelta(0);

    try {
      const data = await fetchDashboardSummary(nextRange);
      if (requestIdRef.current !== requestId) return;
      summaryCacheRef.current[nextRange] = data;
      setSummary(data);
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      const err = error as Error | { message?: string };
      setError(err?.message ?? 'Khong the tai du lieu.');
    } finally {
      if (requestIdRef.current !== requestId) return;
      if (isFirstLoad) setIsLoading(false);
      else setIsRefreshing(false);
    }
  }, [summary]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(range);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [range, load]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const liveKPIs: DashboardKPIs | null = summary?.kpis
    ? {
        ...summary.kpis,
        totalOrders: summary.kpis.totalOrders + liveOrdersDelta,
        totalRevenue: summary.kpis.totalRevenue + liveRevenueDelta,
      }
    : null;

  const rangeTabs = rangeOptions.map((option) => ({
    key: option.value,
    label: option.label,
  }));

  return (
    <AdminPageShell>
      <div className="relative pb-3">
        <AdminPageHeader
          eyebrow={t('page.label')}
          title={t('page.title')}
          actions={
            <>
              <AdminTabs
                items={rangeTabs}
                activeKey={range}
                onChange={(key) => setRange(key as DashboardRange)}
              />
              <NotificationBell />
            </>
          }
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-full"
        >
          <div
            className={`absolute inset-0 rounded-full bg-white/[0.04] transition-opacity duration-150 ${
              isRefreshing ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            data-dashboard-refresh-rail="true"
            data-refreshing={isRefreshing ? 'true' : 'false'}
            className={`absolute inset-y-0 left-0 w-1/3 rounded-full bg-primary/80 transition-[opacity,transform] duration-200 ${
              isRefreshing ? 'animate-pulse opacity-100 translate-x-0' : 'opacity-0 -translate-y-1'
            }`}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <DashboardCards kpis={liveKPIs} isLoading={isLoading} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex min-h-[360px] flex-col lg:col-span-8">
          <RevenueChart
            data={summary?.revenueChart ?? []}
            isLoading={isLoading}
            range={range}
          />
        </div>

        <div className="flex flex-col lg:col-span-4">
          <TopProducts
            products={summary?.topProducts ?? []}
            isLoading={isLoading}
          />
        </div>
      </div>

      <RecentOrders
        orders={summary?.recentOrders ?? []}
        isLoading={isLoading}
      />

      <NewOrderToast
        title={t('toast.newOrderTitle')}
        message={t('toast.newOrderMessage')}
        visible={toastVisible}
      />
    </AdminPageShell>
  );
};
