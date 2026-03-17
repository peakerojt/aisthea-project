import { api } from '@/common/utils/api';
import { DashboardRange, DashboardSummary } from '@/common/services/dashboard.service';

export const dashboardApi = {
    fetchSummary: (range: DashboardRange = 'month') =>
        api.get<DashboardSummary>(`/api/dashboard/summary?range=${range}`, {
            cacheTtlMs: 15_000,
            dedupeKey: `dashboard-summary:${range}`,
        })
};
