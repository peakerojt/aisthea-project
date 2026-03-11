import { api } from '@/common/utils/api';
import { AnalyticsSummary } from '@/common/services/analytics.service';

export const analyticsApi = {
    fetchSummary: (qs: string) => api.get<AnalyticsSummary>(`/api/analytics/summary${qs ? `?${qs}` : ''}`)
};
