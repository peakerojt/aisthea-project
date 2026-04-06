import { api } from '@/common/utils/api';
import { AdminUser } from '@/common/services/user-admin.service';

export const userAdminApi = {
    fetchUsers: (params: Record<string, string>) => api.get<{
        success: boolean;
        data: AdminUser[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>('/api/users', { params }),

    updateStatus: (userId: number) => api.patch<{ success: boolean; message: string; data: { userId: number; status: string } }>(`/api/users/${userId}/status`),

    updateRole: (userId: number, roleId: number) => api.patch<{ success: boolean; message: string }>(`/api/users/${userId}/role`, { roleId })
};
