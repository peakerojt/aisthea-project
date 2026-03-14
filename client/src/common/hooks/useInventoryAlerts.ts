import { useQuery } from '@tanstack/react-query';
import { fetchLowStockAlerts, LowStockAlertsResponse } from '@/common/services/inventory.service';

const FIVE_MINUTES = 5 * 60 * 1000;

/**
 * useInventoryAlerts
 * Fetches low-stock alert data from the server every 5 minutes.
 * Returns { data, isLoading, isError, refetch }.
 */
export function useInventoryAlerts() {
    return useQuery<LowStockAlertsResponse, Error>({
        queryKey: ['inventory-alerts'],
        queryFn: fetchLowStockAlerts,
        staleTime: FIVE_MINUTES,
        refetchInterval: FIVE_MINUTES,
        // Don't throw; components handle error state themselves
        retry: 1,
    });
}
