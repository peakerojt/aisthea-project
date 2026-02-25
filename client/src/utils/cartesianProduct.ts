// ─── Shared Types ─────────────────────────────────────────────────────────────

/** One attribute group (e.g. { name: 'Màu sắc', values: ['Đỏ', 'Xanh'] }) */
export interface AttributeGroup {
    id: number;
    name: string;
    values: string[];
}

/** One attribute pair within a variant combination */
export interface AttributePair {
    attr: string;   // attribute name, e.g. 'Màu sắc'
    value: string;  // attribute value, e.g. 'Đỏ'
}

/** One row in the variant matrix */
export interface VariantRow {
    /** Unique local ID (random string for new rows, 'existing-{id}' for DB rows) */
    id: string;
    /** DB variant ID — undefined means the row is new and not yet saved */
    variantId?: number;
    /** Human-readable label, e.g. 'Đỏ / S' */
    label: string;
    /** The attribute combination that defines this variant */
    combination: AttributePair[];
    sku: string;
    price: string;
    stock: string;
}

// ─── Zod schema fragment (import in parent form) ───────────────────────────────
// Kept as a plain object description so callers can import & compose.
export const variantRowShape = {
    id: 'string',
    variantId: 'number | undefined',
    label: 'string — min 1',
    sku: 'string — min 1',
    price: 'string — coerce number > 0',
    stock: 'string — coerce number >= 0',
} as const;

// ─── Core Algorithm ───────────────────────────────────────────────────────────

/**
 * Generate the Cartesian Product of all attribute group values.
 *
 * Example:
 *   groups = [{ name:'Màu', values:['Đỏ','Xanh'] }, { name:'Size', values:['S','M'] }]
 *   → [[Màu:Đỏ, Size:S], [Màu:Đỏ, Size:M], [Màu:Xanh, Size:S], [Màu:Xanh, Size:M]]
 *
 * Only groups with both a non-empty name AND at least one value are included.
 */
export function generateCombinations(groups: AttributeGroup[]): AttributePair[][] {
    const valid = groups.filter(g => g.name.trim() !== '' && g.values.length > 0);
    if (valid.length === 0) return [];

    return valid.reduce<AttributePair[][]>(
        (acc, g) =>
            acc.flatMap(combo =>
                g.values.map(v => [...combo, { attr: g.name, value: v }])
            ),
        [[]]   // start with one empty combo so flatMap works on the first group
    );
}

// ─── SKU Helper ───────────────────────────────────────────────────────────────

/**
 * Build a SKU suffix from a variant combination.
 * Example: [{ attr:'Màu', value:'Đỏ' }, { attr:'Size', value:'XL' }] → 'DO-XL'
 */
export function buildSkuSuffix(combination: AttributePair[]): string {
    return combination
        .map(c =>
            c.value
                .normalize('NFD')                   // decompose accents
                .replace(/[\u0300-\u036f]/g, '')    // strip diacritics
                .replace(/đ/gi, 'd')
                .replace(/[^a-z0-9]/gi, '')
                .toUpperCase()
                .slice(0, 4)
        )
        .join('-');
}

// ─── Matrix Sync ──────────────────────────────────────────────────────────────

/**
 * Merge new combinations into existing variant rows.
 * - Rows whose label still matches → keep Price/Stock (preserve user data)
 * - Rows with a new label → create fresh row with baseSku + basePrice defaults
 */
export function syncVariantMatrix(
    combinations: AttributePair[][],
    prevRows: VariantRow[],
    baseSku: string,
    basePrice: string,
): VariantRow[] {
    return combinations.map(combo => {
        const label = combo.map(c => c.value).join(' / ');
        const existing = prevRows.find(r => r.label === label);
        if (existing) return existing; // preserve entered price/stock

        const suffix = buildSkuSuffix(combo);
        const skuBase = baseSku.trim() || 'SKU';
        return {
            id: Math.random().toString(36).slice(2),
            label,
            combination: combo,
            sku: `${skuBase}-${suffix}`,
            price: basePrice || '',
            stock: '0',
        };
    });
}
