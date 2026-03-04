import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
} from '../services/dashboard.service';

// ─────────────────────────────────────────────────────────────────────────────

interface AdminDashboardProps {
   setView?: (view: ViewState) => void;
}

// RANGE_OPTIONS are defined inside the component so they can use t()

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

   const load = useCallback(async (r: DashboardRange) => {
      setIsLoading(true);
      setError(null);
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

         {/* ── Row 1: KPI Cards ───────────────────────────────────────────────── */}
         <DashboardCards kpis={summary?.kpis ?? null} isLoading={isLoading} />

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

      </div>
   );
};