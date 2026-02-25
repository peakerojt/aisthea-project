/**
 * groupVariantsHelper.ts
 *
 * Transforms a flat VariantRow[] into a grouped structure,
 * keyed by the value of the first (primary) attribute.
 *
 * Example:
 *   Input:  [{ combination:[{attr:'Màu',value:'Đỏ'},{attr:'Size',value:'S'}] }, ...]
 *   Output: { 'Đỏ': [row1, row2], 'Xanh': [row3, row4] }
 */

import { VariantRow } from './cartesianProduct';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VariantGroup {
    /** The shared primary attribute value, e.g. 'Đỏ' */
    primaryValue: string;
    /** Human label for the group header e.g. 'Màu sắc: Đỏ' */
    label: string;
    /** The primary attribute name, e.g. 'Màu sắc' */
    primaryAttr: string;
    /** All variant rows belonging to this group */
    rows: VariantRow[];
}

export interface GroupedVariants {
    /** Name of the primary (grouping) attribute, e.g. 'Màu sắc' */
    primaryAttrName: string;
    /** Secondary attribute name (column inside each group), e.g. 'Kích thước' — may be empty */
    secondaryAttrName: string;
    /** Ordered list of groups */
    groups: VariantGroup[];
    /** True when all variants have no combination (no attributes defined) */
    isFlat: boolean;
}

// ─── Main Helper ──────────────────────────────────────────────────────────────

/**
 * Group a flat VariantRow[] by the value of the first (primary) attribute.
 * If variants have no attributes, returns a single "All" group (isFlat=true).
 */
export function groupVariants(rows: VariantRow[]): GroupedVariants {
    if (rows.length === 0) {
        return {
            primaryAttrName: '',
            secondaryAttrName: '',
            groups: [],
            isFlat: true,
        };
    }

    // Detect primary and secondary attribute names from the first row
    const firstCombo = rows[0].combination;
    const primaryAttrName = firstCombo[0]?.attr ?? '';
    const secondaryAttrName = firstCombo[1]?.attr ?? '';

    // Flat variants (no attributes defined yet)
    if (!primaryAttrName) {
        return {
            primaryAttrName: '',
            secondaryAttrName: '',
            groups: [{
                primaryValue: 'Tất cả',
                label: 'Tất cả phân loại',
                primaryAttr: '',
                rows,
            }],
            isFlat: true,
        };
    }

    // Group by primary attribute value — use a Map to preserve insertion order
    const map = new Map<string, VariantRow[]>();
    for (const row of rows) {
        const primaryVal = row.combination.find(c => c.attr === primaryAttrName)?.value ?? '(Khác)';
        if (!map.has(primaryVal)) map.set(primaryVal, []);
        map.get(primaryVal)!.push(row);
    }

    const groups: VariantGroup[] = Array.from(map.entries()).map(([primaryValue, groupRows]) => ({
        primaryValue,
        label: primaryAttrName ? `${primaryAttrName}: ${primaryValue}` : primaryValue,
        primaryAttr: primaryAttrName,
        rows: groupRows,
    }));

    return { primaryAttrName, secondaryAttrName, groups, isFlat: false };
}

// ─── Color Emoji Hint Helper ──────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
    đỏ: '🔴', xanh: '🔵', xanhla: '🟢', vang: '🟡', cam: '🟠', tim: '🟣',
    trang: '⚪', den: '⚫', nau: '🟤', hong: '🩷', be: '🟤', xam: '🩶',
    'xanh lá': '🟢', 'xanh dương': '🔵', 'xanh navy': '🌊',
};

/** Return a color emoji hint for Vietnamese color names, or empty string */
export function getColorEmoji(value: string): string {
    const key = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/\s+/g, ' ')
        .trim();
    return COLOR_MAP[key] ?? '';
}
