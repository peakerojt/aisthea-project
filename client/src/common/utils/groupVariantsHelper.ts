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

import { VariantRow } from '@/common/utils/cartesianProduct';

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

    // Prioritize 'Màu sắc' or 'Color' over positional order
    let primaryAttrName = '';
    let secondaryAttrName = '';

    const colorCombo = firstCombo.find(c => c.attr === 'Màu sắc' || c.attr === 'Color' || c.attr === 'color');
    if (colorCombo) {
        primaryAttrName = colorCombo.attr;
        secondaryAttrName = firstCombo.find(c => c.attr !== primaryAttrName)?.attr ?? '';
    } else {
        primaryAttrName = firstCombo[0]?.attr ?? '';
        secondaryAttrName = firstCombo[1]?.attr ?? '';
    }

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

// ─── Helper: detect primary attribute name from a flat list of combinations ───

// Attributes that are considered "color" — checked first so they become primary.
// Keep this list minimal; the fallback already handles everything else.
const COLOR_ATTR_NAMES = ['Màu sắc', 'Màu', 'Color', 'color', 'Couleur'] as const;

/**
 * Given any variant's attribute list (in either the SP or REST shape),
 * return the value of its primary (grouping) attribute.
 *
 * This mirrors the logic in `groupVariants()` — no hardcoding of "Màu sắc".
 *
 * @param attrs - array of { attr: string; value: string } (REST shape) OR
 *                array of { attributeName: string; attributeValue: string } (SP shape)
 */
export function getPrimaryAttrValue(
    attrs: Array<{ attr?: string; value?: string; attributeName?: string; attributeValue?: string }>
): string | undefined {
    if (!attrs || attrs.length === 0) return undefined;

    // Normalise to { name, value }
    const normalised = attrs.map(a => ({
        name: a.attr ?? a.attributeName ?? '',
        val: a.value ?? a.attributeValue ?? '',
    }));

    // Prefer a known "color" attribute
    const colorEntry = normalised.find(n => (COLOR_ATTR_NAMES as readonly string[]).includes(n.name));
    if (colorEntry) return colorEntry.val;

    // Fallback: first attribute (same as groupVariants fallback)
    return normalised[0]?.val;
}

