import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface HasPermissionProps {
    /** The permission code that is required to render children */
    required: string;
    /** Content rendered only when user has the required permission */
    children: React.ReactNode;
    /**
     * Optional fallback rendered when the user does NOT have permission.
     * If omitted, nothing is rendered (element is completely removed from DOM).
     */
    fallback?: React.ReactNode;
}

/**
 * Conditional rendering wrapper based on RBAC permissions.
 * The children are completely REMOVED from the DOM when the user lacks the required permission.
 * This prevents any DOM-based exposure of restricted UI elements.
 *
 * @example
 * <HasPermission required="DELETE_PRODUCT">
 *   <button onClick={handleDelete}>Xóa sản phẩm</button>
 * </HasPermission>
 */
export const HasPermission: React.FC<HasPermissionProps> = ({ required, children, fallback = null }) => {
    const { can } = usePermissions();

    if (!can(required)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

export default HasPermission;
