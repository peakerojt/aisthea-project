import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Lock, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { Checkbox } from '@/admin/components/checkbox';
import {
  AdminBadge,
  AdminPageHeader,
  AdminPageShell,
  AdminPrimaryButton,
  AdminSectionCard,
  AdminTabs,
} from '@/admin/components/AdminUI';
import {
  getPermissionManagementRoles,
  getRoleDisplayValue,
  roleService,
  RoleItem,
  PermissionItem,
} from '@/admin/services/role.service';
import {
  getActionFromCode,
  getModuleAccessPermissions,
  getOperationPermissionPresentation,
  getRefundSensitivePermissions,
  getSpecializedOperationPermissions,
  MODULE_ACCESS_PERMISSION_ORDER,
} from '@/admin/utils/permissionPresentation';
import { useToast } from '@/common/contexts/ToastContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupPermissions(permissions: PermissionItem[]) {
  const grouped: Record<string, Record<string, PermissionItem>> = {};
  for (const permission of permissions) {
    const action = getActionFromCode(permission.code);
    if (!grouped[permission.module]) grouped[permission.module] = {};
    grouped[permission.module][action] = permission;
  }
  return grouped;
}

type ToastType = 'success' | 'error';

// ─── Shared row component for refund-sensitive / specialized permissions ───────

function OperationPermissionRow({
  permission,
  isChecked,
  isDisabled,
  badge,
  t,
  onToggle,
}: {
  permission: PermissionItem;
  isChecked: boolean;
  isDisabled: boolean;
  badge?: React.ReactNode;
  t: (key: string, options?: Record<string, unknown>) => string;
  onToggle: (id: number) => void;
}) {
  const presentation = getOperationPermissionPresentation(permission);
  const title = t(presentation.titleKey) === presentation.titleKey
    ? presentation.titleFallback
    : t(presentation.titleKey);
  const description = t(presentation.descriptionKey) === presentation.descriptionKey
    ? presentation.descriptionFallback
    : t(presentation.descriptionKey);

  return (
    <div className="flex items-center gap-4 px-6 py-5 odd:bg-transparent even:bg-white/[0.01]">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-white">{title}</span>
          {badge}
        </div>
        <p className="mt-2 max-w-3xl text-xs leading-6 text-white/55">{description}</p>
      </div>
      <div title={permission.description}>
        <Checkbox
          id={`perm-${permission.permissionId}`}
          checked={isChecked}
          disabled={isDisabled}
          onCheckedChange={() => onToggle(permission.permissionId)}
          className={`h-5 w-5 rounded border-white/20 ${
            isDisabled
              ? 'cursor-not-allowed opacity-40'
              : 'cursor-pointer data-[state=checked]:border-primary data-[state=checked]:bg-primary'
          }`}
        />
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export const Roles: React.FC = () => {
  const { t } = useTranslation('roles');
  const { showToast: fireToast } = useToast();

  const translateOrFallback = useCallback((key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  }, [t]);

  // C4: memoize label objects so they don't recreate every render
  const moduleLabels = useMemo<Record<string, string>>(() => ({
    PRODUCT: t('modules.PRODUCT'),
    ORDER: t('modules.ORDER'),
    INVENTORY: t('modules.INVENTORY'),
    CUSTOMER: t('modules.CUSTOMER'),
    REVENUE: t('modules.REVENUE'),
    COUPON: t('modules.COUPON'),
    RETURNS: t('modules.RETURNS'),
  }), [t]);

  const moduleHints = useMemo<Partial<Record<string, string>>>(() => ({
    RETURNS: translateOrFallback(
      'moduleHints.RETURNS',
      'Nhóm quyền này mở trang Hoàn trả và các bước vận hành trả hàng. Không bao gồm thao tác hoàn tiền nhạy cảm.',
    ),
  }), [translateOrFallback]);

  const actionLabels = useMemo<Record<string, string>>(() => ({
    VIEW: t('actions.VIEW'),
    CREATE: t('actions.CREATE'),
    EDIT: t('actions.EDIT'),
    DELETE: t('actions.DELETE'),
    MANAGE: t('actions.MANAGE'),
  }), [t]);

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // C2: stable refs so the load effect has no unnecessary deps
  const fireToastRef = useRef(fireToast);
  fireToastRef.current = fireToast;
  const tRef = useRef(t);
  tRef.current = t;

  const showToast = useCallback((message: string, type: ToastType) => {
    fireToastRef.current({ type, title: message });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const [rolesData, permsData] = await Promise.all([
          roleService.getRoles(),
          roleService.getPermissions(),
        ]);
        if (cancelled) return;
        const managementRoles = getPermissionManagementRoles(rolesData);
        setRoles(rolesData);
        setPermissions(permsData);
        const firstRole = managementRoles.find((r) => !r.isProtected) ?? managementRoles[0];
        if (firstRole) {
          setSelectedRoleId(firstRole.roleId);
          setCheckedIds(new Set(firstRole.permissionIds));
        }
      } catch {
        if (!cancelled) showToast(tRef.current('feedback.accessDenied'), 'error');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [showToast]);

  const permissionManagementRoles = getPermissionManagementRoles(roles);
  const selectedRole = permissionManagementRoles.find((r) => r.roleId === selectedRoleId);
  const selectedRoleDisplayName = selectedRole ? getRoleDisplayValue(selectedRole) : '-';

  const moduleAccessPermissions = getModuleAccessPermissions(permissions);
  const refundSensitivePermissions = getRefundSensitivePermissions(permissions);
  const specializedPermissions = getSpecializedOperationPermissions(permissions);
  const grouped = groupPermissions(moduleAccessPermissions);
  const modules = MODULE_ACCESS_PERMISSION_ORDER.filter((m) => grouped[m]);
  const actions = Object.keys(actionLabels);

  // C1: only enable Save when something actually changed
  const hasChanges = useMemo(() => {
    if (!selectedRole) return false;
    const original = new Set(selectedRole.permissionIds);
    if (original.size !== checkedIds.size) return true;
    for (const id of checkedIds) if (!original.has(id)) return true;
    return false;
  }, [checkedIds, selectedRole]);

  const handleRoleSelect = (roleId: number) => {
    const role = permissionManagementRoles.find((r) => r.roleId === roleId);
    if (!role) return;
    setSelectedRoleId(roleId);
    setCheckedIds(new Set(role.permissionIds));
  };

  const togglePermission = (permissionId: number) => {
    if (selectedRole?.isProtected) return;
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRoleId || selectedRole?.isProtected || !hasChanges) return;
    setIsSaving(true);
    try {
      await roleService.updateRolePermissions(selectedRoleId, [...checkedIds]);
      setRoles((prev) =>
        prev.map((r) =>
          r.roleId === selectedRoleId ? { ...r, permissionIds: [...checkedIds] } : r,
        ),
      );
      showToast(t('feedback.saveSuccess'), 'success');
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast(err?.response?.data?.message ?? t('feedback.accessDenied'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw size={32} className="animate-spin text-primary" />
          <p className="text-sm text-white/50">{t('feedback.loading')}</p>
        </div>
      </div>
    );
  }

  const roleTabs = permissionManagementRoles.map((role) => ({
    key: String(role.roleId),
    label: (
      <span className="inline-flex items-center gap-2">
        {role.isProtected && <Lock size={13} className="shrink-0" />}
        <span>{getRoleDisplayValue(role)}</span>
      </span>
    ),
    count: role.permissionIds.length,
  }));

  const isRowDisabled = !!selectedRole?.isProtected;

  return (
    <AdminPageShell className="max-w-7xl">
      {/* ── Header + Tabs ─────────────────────────────────────────────── */}
      <AdminSectionCard className="overflow-hidden" bodyClassName="h-full">
        <div className="space-y-5 border-b border-white/[0.06] p-5 lg:p-6">
          <AdminPageHeader
            icon={ShieldCheck}
            title={t('page.title')}
            subtitle={t('page.subtitle')}
            actions={(
              <AdminPrimaryButton
                onClick={handleSave}
                disabled={isSaving || isRowDisabled || !hasChanges}
              >
                {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                {isSaving ? t('actions_btn.saving') : t('actions_btn.save')}
              </AdminPrimaryButton>
            )}
          />

          <AdminTabs
            items={roleTabs}
            activeKey={selectedRoleId ? String(selectedRoleId) : ''}
            onChange={(key) => handleRoleSelect(Number(key))}
          />

          {selectedRole?.isProtected && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
              <Lock size={18} className="shrink-0 text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-amber-400">{t('protected.title')}</p>
                <p className="mt-0.5 text-xs text-amber-400/70">{t('protected.description')}</p>
              </div>
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" />
                <p className="text-sm font-semibold text-white">
                  {translateOrFallback('sections.moduleAccess.title', 'Quyền truy cập phân hệ')}
                </p>
              </div>
              <p className="mt-2 text-xs leading-6 text-white/60">
                {translateOrFallback(
                  'sections.moduleAccess.description',
                  'Quyết định vai trò có nhìn thấy hoặc đi vào phân hệ nào trong admin. Đây là lớp quyền dùng cho điều hướng và thao tác vận hành thông thường.',
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-amber-400" />
                <p className="text-sm font-semibold text-white">
                  {translateOrFallback('sections.sensitiveOperations.title', 'Thao tác hoàn tiền nhạy cảm')}
                </p>
              </div>
              <p className="mt-2 text-xs leading-6 text-white/60">
                {translateOrFallback(
                  'sections.sensitiveOperations.description',
                  'Tách riêng khỏi quyền truy cập phân hệ để dễ nhận biết các quyền liên quan đến tài chính, hoàn tiền và chứng từ.',
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── Module × Action matrix ─────────────────────────────────── */}
        <div className="border-b border-white/8 bg-white/[0.02] px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-primary" />
            <p className="text-sm font-semibold text-white">
              {translateOrFallback('sections.moduleAccess.heading', 'Quyền truy cập & vận hành theo phân hệ')}
            </p>
          </div>
          <p className="mt-2 text-xs leading-6 text-white/60">
            {translateOrFallback(
              'sections.moduleAccess.note',
              'Các ô trong bảng dưới đây dùng để mở phân hệ và cho phép thao tác vận hành thông thường. Riêng Hoàn trả tại đây chỉ bao gồm truy cập module và quy trình trả hàng, không bao gồm thao tác hoàn tiền nhạy cảm.',
            )}
          </p>
        </div>

        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] border-b border-white/8">
          <div className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-white/40">
            {t('table.module')}
          </div>
          {actions.map((action) => (
            <div key={action} className="px-4 py-4 text-center text-xs font-bold uppercase tracking-widest text-white/40">
              {actionLabels[action]}
            </div>
          ))}
        </div>

        <div className="divide-y divide-white/5">
          {modules.map((moduleName) => {
            const modulePermissions = grouped[moduleName] ?? {};
            return (
              <div
                key={moduleName}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] items-center transition-colors hover:bg-white/[0.02] odd:bg-transparent even:bg-white/[0.01]"
              >
                <div className="px-6 py-5">
                  {/* N3: null-safe fallback with ?? */}
                  <span className="text-sm font-semibold text-white/90">{moduleLabels[moduleName] ?? moduleName}</span>
                  {moduleHints[moduleName] && (
                    <p className="mt-1 max-w-xl text-xs leading-6 text-white/45">
                      {moduleHints[moduleName]}
                    </p>
                  )}
                </div>
                {actions.map((action) => {
                  const permission = modulePermissions[action];
                  if (!permission) {
                    return (
                      <div key={action} className="flex justify-center py-5">
                        <span className="flex h-5 w-5 items-center justify-center text-white/15">-</span>
                      </div>
                    );
                  }
                  return (
                    <div key={action} className="flex justify-center py-5" title={permission.description}>
                      <Checkbox
                        id={`perm-${permission.permissionId}`}
                        checked={checkedIds.has(permission.permissionId)}
                        disabled={isRowDisabled}
                        onCheckedChange={() => togglePermission(permission.permissionId)}
                        className={`h-5 w-5 rounded border-white/20 ${
                          isRowDisabled
                            ? 'cursor-not-allowed opacity-40'
                            : 'cursor-pointer data-[state=checked]:border-primary data-[state=checked]:bg-primary'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {modules.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-white/30">
            <ShieldCheck size={36} />
            <p className="text-sm">{t('empty.noPermissions')}</p>
            <p className="text-xs text-white/20">{t('empty.seedHint')}</p>
          </div>
        )}
      </AdminSectionCard>

      {/* ── Refund-sensitive permissions ──────────────────────────────── */}
      {refundSensitivePermissions.length > 0 && (
        <AdminSectionCard className="overflow-hidden" bodyClassName="h-full">
          <div className="border-b border-white/8 bg-amber-500/[0.06] px-6 py-4">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-amber-400" />
              <p className="text-sm font-semibold text-white">
                {translateOrFallback('sections.sensitiveOperations.heading', 'Quyền hoàn tiền nhạy cảm')}
              </p>
              <AdminBadge tone="warning">
                {translateOrFallback('badges.noNavigation', 'Không mở menu')}
              </AdminBadge>
            </div>
            <p className="mt-2 text-xs leading-6 text-white/60">
              {translateOrFallback(
                'sections.sensitiveOperations.note',
                'Nhóm quyền này không tự mở menu hoặc cấp quyền điều hướng. Chúng chỉ cho phép xem hoặc thực hiện các bước hoàn tiền/tài chính nhạy cảm bên trong quy trình.',
              )}
            </p>
          </div>
          <div className="divide-y divide-white/5">
            {refundSensitivePermissions.map((permission) => (
              <OperationPermissionRow
                key={permission.permissionId}
                permission={permission}
                isChecked={checkedIds.has(permission.permissionId)}
                isDisabled={isRowDisabled}
                badge={<AdminBadge tone="warning">{t('badges.refundSensitive')}</AdminBadge>}
                t={t}
                onToggle={togglePermission}
              />
            ))}
          </div>
        </AdminSectionCard>
      )}

      {/* ── Specialized permissions ───────────────────────────────────── */}
      {specializedPermissions.length > 0 && (
        <AdminSectionCard className="overflow-hidden" bodyClassName="h-full">
          <div className="border-b border-white/8 bg-white/[0.02] px-6 py-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary" />
              <p className="text-sm font-semibold text-white">
                {translateOrFallback('sections.specializedOperations.heading', 'Quyền chuyên biệt khác')}
              </p>
              <AdminBadge tone="info">
                {translateOrFallback('badges.specialized', 'Chuyên biệt')}
              </AdminBadge>
            </div>
            <p className="mt-2 text-xs leading-6 text-white/60">
              {translateOrFallback(
                'sections.specializedOperations.note',
                'Các quyền dưới đây là quyền dữ liệu/chức năng chuyên biệt. Chúng không phải là quyền mở menu điều hướng của admin shell.',
              )}
            </p>
          </div>
          <div className="divide-y divide-white/5">
            {specializedPermissions.map((permission) => (
              <OperationPermissionRow
                key={permission.permissionId}
                permission={permission}
                isChecked={checkedIds.has(permission.permissionId)}
                isDisabled={isRowDisabled}
                t={t}
                onToggle={togglePermission}
              />
            ))}
          </div>
        </AdminSectionCard>
      )}

      {/* ── Summary footer ────────────────────────────────────────────── */}
      <AdminSectionCard bodyClassName="px-5 py-4">
        <div className="flex items-center gap-3 text-sm text-white/65">
          <ShieldCheck size={16} className="shrink-0 text-primary" />
          <p>
            <Trans
              i18nKey="summary.text"
              t={t}
              values={{
                roleName: selectedRoleDisplayName,
                active: checkedIds.size,
                total: permissions.length,
              }}
              components={[
                <strong className="font-semibold text-white/80" />,
                <strong className="font-semibold text-white/80" />,
              ]}
            />
          </p>
          {selectedRole && (
            <AdminBadge tone="info" className="ml-auto">
              {selectedRoleDisplayName}
            </AdminBadge>
          )}
        </div>
      </AdminSectionCard>
    </AdminPageShell>
  );
};

export default Roles;
