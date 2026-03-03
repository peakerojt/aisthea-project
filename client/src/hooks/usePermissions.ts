import { useAuth } from '../contexts/AuthContext';

/**
 * Hook for checking user permissions at a granular level.
 *
 * Usage:
 *   const { can } = usePermissions();
 *   if (can('DELETE_PRODUCT')) { ... }
 */
export const usePermissions = () => {
    const { permissions } = useAuth();

    /**
     * Returns true if the current user has the specified permission code.
     * Super Admin effectively has all permissions (handled server-side anyway).
     */
    const can = (permissionCode: string): boolean => {
        return permissions.includes(permissionCode);
    };

    /**
     * Returns true if the user has ALL of the specified permission codes.
     */
    const canAll = (...permissionCodes: string[]): boolean => {
        return permissionCodes.every((code) => permissions.includes(code));
    };

    /**
     * Returns true if the user has AT LEAST ONE of the specified permission codes.
     */
    const canAny = (...permissionCodes: string[]): boolean => {
        return permissionCodes.some((code) => permissions.includes(code));
    };

    return { can, canAll, canAny, permissions };
};
