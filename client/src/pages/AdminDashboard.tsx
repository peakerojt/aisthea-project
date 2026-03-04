import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingBag } from 'lucide-react';
import { ViewState } from '../types';
import { NotificationBell } from '../components/NotificationBell';
import { DashboardCards } from '../components/Dashboard/DashboardCards';
import { RevenueChart } from '../components/Dashboard/RevenueChart';
import { TopProducts } from '../components/Dashboard/TopProducts';
import { RecentOrders } from '../components/Dashboard/RecentOrders';
import {
   fetchDashboardSummary,
   DashboardRange,
   DashboardSummary,
   DashboardKPIs,
} from '../services/dashboard.service';
import { useAdminSocket, NewOrderPayload } from '../hooks/useAdminSocket';

// ─────────────────────────────────────────────────────────────────────────────
// Toast notification component
// ─────────────────────────────────────────────────────────────────────────────

interface ToastProps {
   title: string;
   message: string;
   visible: boolean;
}

const NewOrderToast: React.FC<ToastProps> = ({ title, message, visible }) => (
   <div
      className={`
         fixed bottom-6 right-6 z-50 flex items-center gap-3
         bg-[#0d1117] border border-emerald-500/40 rounded-xl px-4 py-3
         shadow-[0_0_24px_rgba(16,185,129,0.25)]
         transition-all duration-500
         ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
      `}
   >
      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
         <ShoppingBag className="w-4 h-4 text-emerald-400" />
      </div>
      <div>
         <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-0.5">
            {title}
         </p>
         <p className="text-sm font-semibold text-white">{message}</p>
      </div>
      <span className="ml-2 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
   </div>
);


// ─────────────────────────────────────────────────────────────────────────────

interface AdminDashboardProps {
   setView?: (view: ViewState) => void;
}

// ─────────────────────────────────────────────────────────────────────────────

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ setView }) => {
   const { t } = useTranslation('dashboard');
   const RANGE_OPTIONS: { value: DashboardRange; label: string }[] = [
      { value: 'today', label: t('range.today') },
      { value: 'week', label: t('range.week') },
      { value: 'month', label: t('range.month') },
      { value: 'year', label: t('range.year') },
   ];
   const [range, setRange] = useState<DashboardRange>('month');
   const [summary, setSummary] = useState<DashboardSummary | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   // ── Real-time live KPI override ────────────────────────────────────────────
   // Stores incremental adjustments applied by socket events on top of server data.
   const [liveOrdersDelta, setLiveOrdersDelta] = useState(0);
   const [liveRevenueDelta, setLiveRevenueDelta] = useState(0);

   // ── Toast state ────────────────────────────────────────────────────────────
   const [toastVisible, setToastVisible] = useState(false);
   const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

   const showToast = () => {
      setToastVisible(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToastVisible(false), 4000);
   };

   // ── Socket new_order handler ───────────────────────────────────────────────
   const handleNewOrder = useCallback((payload: NewOrderPayload) => {
      setLiveOrdersDelta(prev => prev + 1);
      setLiveRevenueDelta(prev => prev + payload.totalAmount);
      showToast();
   }, []);

   // Connect to admin socket room
   useAdminSocket(handleNewOrder);

   // ── Data loading ───────────────────────────────────────────────────────────
   const load = useCallback(async (r: DashboardRange) => {
      setIsLoading(true);
      setError(null);
      // Reset live deltas when reloading fresh data
      setLiveOrdersDelta(0);
      setLiveRevenueDelta(0);
      try {
         const data = await fetchDashboardSummary(r);
         setSummary(data);
      } catch (e: any) {
         setError(e?.message ?? 'Không thể tải dữ liệu.');
      } finally {
         setIsLoading(false);
      }
   }, []);

   useEffect(() => {
      load(range);
   }, [range, load]);

   // Cleanup toast timer on unmount
   useEffect(() => {
      return () => {
         if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      };
   }, []);

   // ── Compute live-adjusted KPIs ─────────────────────────────────────────────
   const liveKPIs: DashboardKPIs | null = summary?.kpis
      ? {
         ...summary.kpis,
         totalOrders: summary.kpis.totalOrders + liveOrdersDelta,
         totalRevenue: summary.kpis.totalRevenue + liveRevenueDelta,
      }
      : null;

   return (
      <div className="p-6 xl:p-8 max-w-[1600px] mx-auto space-y-6 animate-fade-in">

         {/* ── Header ─────────────────────────────────────────────────────────── */}
         <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-white/5">
            <div>
               <p className="text-xs font-bold text-primary tracking-[0.2em] uppercase mb-1.5">
                  {t('page.label')}
               </p>
               <h2 className="text-3xl xl:text-4xl font-black text-white tracking-tighter uppercase">
                  {t('page.title')}
               </h2>
            </div>

            <div className="flex items-center gap-3">
               {/* Date range selector */}
               <div className="flex bg-white/[0.04] border border-white/10 rounded-lg p-1 gap-1">
                  {RANGE_OPTIONS.map((opt) => (
                     <button
                        key={opt.value}
                        onClick={() => setRange(opt.value)}
                        className={`
                  px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer
                  ${range === opt.value
                              ? 'bg-primary text-white shadow-sm'
                              : 'text-white/40 hover:text-white/70'}
                `}
                     >
                        {opt.label}
                     </button>
                  ))}
               </div>

               {/* Notification bell */}
               <NotificationBell setView={setView || (() => { })} />
            </div>
         </header>

         {/* ── Error banner ───────────────────────────────────────────────────── */}
         {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
               ⚠ {error}
            </div>
         )}

         {/* ── Row 1: KPI Cards (live-adjusted) ───────────────────────────────── */}
         <DashboardCards kpis={liveKPIs} isLoading={isLoading} />

         {/* ── Row 2: Revenue Chart + Top Products ────────────────────────────── */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Revenue chart — 2/3 width */}
            <div className="lg:col-span-8 min-h-[360px] flex flex-col">
               <RevenueChart
                  data={summary?.revenueChart ?? []}
                  isLoading={isLoading}
                  range={range}
               />
            </div>

            {/* Top selling products — 1/3 width */}
            <div className="lg:col-span-4 flex flex-col">
               <TopProducts
                  products={summary?.topProducts ?? []}
                  isLoading={isLoading}
               />
            </div>
         </div>

         {/* ── Row 3: Recent Orders ───────────────────────────────────────────── */}
         <RecentOrders
            orders={summary?.recentOrders ?? []}
            isLoading={isLoading}
            setView={setView}
         />

         {/* ── Real-time Toast Notification ────────────────────────────────────── */}
         <NewOrderToast
            title={t('toast.newOrderTitle')}
            message={t('toast.newOrderMessage')}
            visible={toastVisible}
         />

      </div>
   );
};