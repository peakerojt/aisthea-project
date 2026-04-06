import { userAdminApi } from '@/common/api/user-admin.api';
// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdminUserRole {
    roleId: number;
    roleName: string;
}

export interface AdminUser {
    userId: number;
    email: string;
    fullName: string;
    phone: string | null;
    avatarUrl: string | null;
    status: string; // 'Active' | 'Banned' | 'Pending'
    createdAt: string | null;
    roles: AdminUserRole[];
    totalOrders: number;
}

export interface FetchAdminUsersParams {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
}

export interface AdminUserListResult {
    users: AdminUser[];
    pagination: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
}

// ─── API Calls ───────────────────────────────────────────────────────────────

export const fetchAdminUsers = async (
    params: FetchAdminUsersParams = {}
): Promise<AdminUserListResult> => {
    const query: Record<string, string> = {};
    if (params.search) query.search = params.search;
    if (params.role && params.role !== 'all') query.role = params.role;
    if (params.status && params.status !== 'all') query.status = params.status;
    if (params.page && params.page > 1) query.page = params.page.toString();
    if (params.limit) query.limit = params.limit.toString();

    const res = await userAdminApi.fetchUsers(query);
    return {
        users: res.data,
        pagination: {
            total: res.meta?.total ?? res.data.length,
            page: res.meta?.page ?? params.page ?? 1,
            pageSize: res.meta?.limit ?? params.limit ?? res.data.length,
            totalPages: res.meta?.totalPages ?? 1,
        },
    };
};

export const patchUserStatus = async (
    userId: number
): Promise<{ success: boolean; message: string; data: { userId: number; status: string } }> => {
    return userAdminApi.updateStatus(userId);
};

export const patchUserRole = async (
    userId: number,
    roleId: number
): Promise<{ success: boolean; message: string }> => {
    return userAdminApi.updateRole(userId, roleId);
};

// ─── Role display helpers ─────────────────────────────────────────────────────

export const RAW_TO_DISPLAY_ROLE_NAME: Record<string, string> = {
    Admin: 'Admin',
    'Super Admin': 'Admin',
    Customer: 'Customer',
    Staff: 'Staff',
    Support: 'Staff',
};

export const ROLE_LABELS: Record<string, string> = {
    Admin: 'Quản trị viên',
    Customer: 'Khách hàng',
    Staff: 'Nhân viên',
};

export const STATUS_LABELS: Record<string, string> = {
    Active: 'Hoạt động',
    Banned: 'Đã khóa',
    Pending: 'Chờ xác nhận',
};

export function getRoleDisplayName(roleName: string): string {
    return RAW_TO_DISPLAY_ROLE_NAME[roleName] ?? roleName;
}

export function isAssignableAdminRole(roleName: string): boolean {
    const normalized = roleName.trim().toLowerCase();
    return normalized === 'admin' || normalized === 'customer' || normalized === 'support' || normalized === 'staff';
}

/** Get the display label for a role name */
export function getRoleLabel(roleName: string): string {
    return ROLE_LABELS[getRoleDisplayName(roleName)] ?? roleName;
}
