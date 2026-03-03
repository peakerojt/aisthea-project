import React, { useState, useEffect, useCallback } from 'react';
import { roleService, RoleItem, PermissionItem } from '../services/role.service';
import { ShieldCheck, Lock, Save, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Checkbox } from '../components/ui/checkbox';

// ─── Vietnamese Module / Action Mapping ──────────────────────────────────────
const MODULE_LABELS: Record<string, string> = {
    PRODUCT: 'Quản lý Sản phẩm',
    ORDER: 'Quản lý Đơn hàng',
    INVENTORY: 'Quản lý Tồn kho',
    CUSTOMER: 'Quản lý Khách hàng',
    REVENUE: 'Báo cáo Doanh thu',
    COUPON: 'Quản lý Mã giảm giá',
};

const ACTION_LABELS: Record<string, string> = {
    VIEW: 'Xem',
    CREATE: 'Thêm',
    EDIT: 'Sửa',
    DELETE: 'Xóa',
    MANAGE: 'Quản lý',
};

/** Derive the action prefix from a permission code e.g. 'VIEW_PRODUCT' → 'VIEW' */
function getActionFromCode(code: string): string {
    const prefix = code.split('_')[0];
    return prefix;
}

/** Group permissions by module then by action */
function groupPermissions(permissions: PermissionItem[]) {
    const grouped: Record<string, Record<string, PermissionItem>> = {};
    for (const p of permissions) {
        const action = getActionFromCode(p.code);
        if (!grouped[p.module]) grouped[p.module] = {};
        grouped[p.module][action] = p;
    }
    return grouped;
}

// ─── Toast Component ──────────────────────────────────────────────────────────
type ToastType = 'success' | 'error';
function Toast({ message, type, onClose }: { message: string; type: ToastType; onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3500);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border text-sm font-medium transition-all animate-in slide-in-from-bottom-4 ${type === 'success'
                ? 'bg-gray-900 border-emerald-500/40 text-emerald-400'
                : 'bg-gray-900 border-red-500/40 text-red-400'
            }`}>
            {type === 'success'
                ? <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                : <AlertTriangle size={18} className="shrink-0 text-red-400" />
            }
            <span>{message}</span>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const AdminRoles: React.FC = () => {
    const [roles, setRoles] = useState<RoleItem[]>([]);
    const [permissions, setPermissions] = useState<PermissionItem[]>([]);
    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
    const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const showToast = useCallback((message: string, type: ToastType) => {
        setToast({ message, type });
    }, []);

    // ── Load data on mount ────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const [rolesData, permsData] = await Promise.all([
                    roleService.getRoles(),
                    roleService.getPermissions(),
                ]);
                setRoles(rolesData);
                setPermissions(permsData);
                // Default select first non-protected role
                const first = rolesData.find((r) => !r.isProtected) || rolesData[0];
                if (first) {
                    setSelectedRoleId(first.roleId);
                    setCheckedIds(new Set(first.permissionIds));
                }
            } catch {
                showToast('Truy cập bị từ chối. Vui lòng liên hệ Quản trị viên.', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [showToast]);

    // ── When selected role changes, sync checkedIds ───────────────────────────
    const handleRoleSelect = (roleId: number) => {
        const role = roles.find((r) => r.roleId === roleId);
        if (role) {
            setSelectedRoleId(roleId);
            setCheckedIds(new Set(role.permissionIds));
        }
    };

    // ── Toggle a single permission checkbox ───────────────────────────────────
    const toggle = (permissionId: number) => {
        if (selectedRole?.isProtected) return;
        setCheckedIds((prev) => {
            const next = new Set(prev);
            if (next.has(permissionId)) next.delete(permissionId);
            else next.add(permissionId);
            return next;
        });
    };

    // ── Save permissions ──────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!selectedRoleId || selectedRole?.isProtected) return;
        setIsSaving(true);
        try {
            await roleService.updateRolePermissions(selectedRoleId, [...checkedIds]);
            // Update local state so the pill count is accurate
            setRoles((prev) =>
                prev.map((r) =>
                    r.roleId === selectedRoleId
                        ? { ...r, permissionIds: [...checkedIds] }
                        : r
                )
            );
            showToast('Cập nhật quyền hạn thành công!', 'success');
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Truy cập bị từ chối. Vui lòng liên hệ Quản trị viên.';
            showToast(msg, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const selectedRole = roles.find((r) => r.roleId === selectedRoleId);
    const grouped = groupPermissions(permissions);
    const allModules = Object.keys(MODULE_LABELS).filter((m) => grouped[m]);
    const allActions = Object.keys(ACTION_LABELS);

    // ─────────────────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw size={32} className="text-primary animate-spin" />
                    <p className="text-white/50 text-sm">Đang tải dữ liệu phân quyền...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* ── Header ─────────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                        <ShieldCheck size={24} className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                            Phân quyền hệ thống
                        </h1>
                        <p className="text-white/40 text-sm mt-0.5">Quản lý quyền hạn theo từng vai trò người dùng</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving || selectedRole?.isProtected}
                    className="flex items-center gap-2.5 px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-white/10 disabled:text-white/30 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                    {isSaving
                        ? <RefreshCw size={16} className="animate-spin" />
                        : <Save size={16} />
                    }
                    {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
            </div>

            {/* ── Role Tabs ───────────────────────────────────────────────────────── */}
            <div className="flex gap-2 flex-wrap">
                {roles.map((role) => (
                    <button
                        key={role.roleId}
                        onClick={() => handleRoleSelect(role.roleId)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${selectedRoleId === role.roleId
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                            }`}
                    >
                        {role.isProtected && <Lock size={13} className="shrink-0" />}
                        {role.roleName}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${selectedRoleId === role.roleId ? 'bg-white/20' : 'bg-white/10'
                            }`}>
                            {role.permissionIds.length}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── Super Admin Notice ─────────────────────────────────────────────── */}
            {selectedRole?.isProtected && (
                <div className="flex items-center gap-3 px-5 py-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <Lock size={18} className="text-amber-400 shrink-0" />
                    <div>
                        <p className="text-amber-400 text-sm font-semibold">Vai trò được bảo vệ</p>
                        <p className="text-amber-400/70 text-xs mt-0.5">
                            Super Admin mặc định có toàn bộ quyền hạn và không thể bị chỉnh sửa.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Permission Matrix Table ────────────────────────────────────────── */}
            <div className="bg-[#0D0D0D] border border-white/8 rounded-2xl overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] border-b border-white/8">
                    <div className="px-6 py-4 text-xs font-bold text-white/40 uppercase tracking-widest">
                        Phân hệ
                    </div>
                    {allActions.map((action) => (
                        <div key={action} className="px-4 py-4 text-xs font-bold text-white/40 uppercase tracking-widest text-center">
                            {ACTION_LABELS[action]}
                        </div>
                    ))}
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-white/5">
                    {allModules.map((module, idx) => {
                        const modulePerms = grouped[module] || {};

                        return (
                            <div
                                key={module}
                                className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] items-center hover:bg-white/[0.02] transition-colors ${idx % 2 === 0 ? '' : 'bg-white/[0.01]'
                                    }`}
                            >
                                {/* Module name */}
                                <div className="px-6 py-5">
                                    <span className="text-sm font-semibold text-white/90" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                                        {MODULE_LABELS[module] || module}
                                    </span>
                                </div>

                                {/* Action checkboxes */}
                                {allActions.map((action) => {
                                    const perm = modulePerms[action];
                                    if (!perm) {
                                        return (
                                            <div key={action} className="flex justify-center py-5">
                                                <span className="w-5 h-5 flex items-center justify-center text-white/15">—</span>
                                            </div>
                                        );
                                    }

                                    const isChecked = checkedIds.has(perm.permissionId);
                                    const isDisabled = !!selectedRole?.isProtected;

                                    return (
                                        <div
                                            key={action}
                                            className="flex justify-center py-5"
                                            title={perm.description}
                                        >
                                            <Checkbox
                                                id={`perm-${perm.permissionId}`}
                                                checked={isChecked}
                                                disabled={isDisabled}
                                                onCheckedChange={() => toggle(perm.permissionId)}
                                                className={`w-5 h-5 rounded border-white/20 transition-all ${isDisabled
                                                        ? 'opacity-40 cursor-not-allowed'
                                                        : 'cursor-pointer data-[state=checked]:bg-primary data-[state=checked]:border-primary'
                                                    }`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Empty state */}
                {allModules.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/30">
                        <ShieldCheck size={36} />
                        <p className="text-sm">Chưa có quyền hạn nào được định nghĩa.</p>
                        <p className="text-xs text-white/20">Hãy chạy seed script để khởi tạo dữ liệu.</p>
                    </div>
                )}
            </div>

            {/* ── Permission Summary ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-5 py-3 bg-white/3 border border-white/8 rounded-xl">
                <ShieldCheck size={16} className="text-primary/70 shrink-0" />
                <p className="text-white/50 text-xs">
                    Vai trò <span className="text-white/80 font-semibold">{selectedRole?.roleName}</span> hiện có{' '}
                    <span className="text-primary font-bold">{checkedIds.size}</span> / {permissions.length} quyền hạn được kích hoạt.
                </p>
            </div>

            {/* ── Toast ─────────────────────────────────────────────────────────── */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default AdminRoles;
