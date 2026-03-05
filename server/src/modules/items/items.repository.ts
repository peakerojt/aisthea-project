/**
 * ItemsRepository — in-memory mock that mirrors a real DB interface.
 *
 * Swap the body of each method for a real Prisma/pg call when the schema is ready.
 *
 * PostgreSQL schema (reference):
 *   CREATE TABLE items (
 *     id         SERIAL PRIMARY KEY,
 *     title      VARCHAR(255) NOT NULL,
 *     sort_order INTEGER      NOT NULL DEFAULT 0,
 *     created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
 *     updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
 *   );
 *   CREATE UNIQUE INDEX items_sort_order_idx ON items (sort_order);
 *
 * A unique index on sort_order prevents two rows from ever colliding, and lets
 * PostgreSQL enforce consistency instead of relying on application-level logic.
 */

export interface Item {
    id: number;
    title: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const seed = (): Item[] =>
    ['Task Alpha', 'Task Beta', 'Task Gamma', 'Task Delta', 'Task Epsilon'].map(
        (title, i) => ({
            id: i + 1,
            title,
            sortOrder: i + 1,
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T00:00:00Z'),
        }),
    );

// Single in-memory store shared across the process (module-level singleton).
let store: Item[] = seed();

// ─── Utility ──────────────────────────────────────────────────────────────────

/** Deep-clone the store so callers can't mutate internals accidentally. */
const clone = (items: Item[]): Item[] =>
    items.map((it) => ({ ...it, createdAt: new Date(it.createdAt), updatedAt: new Date(it.updatedAt) }));

// ─── Repository ───────────────────────────────────────────────────────────────

export class ItemsRepository {
    /** Find all items sorted by sortOrder ASC. */
    async findAllSorted(): Promise<Item[]> {
        return clone(store).sort((a, b) => a.sortOrder - b.sortOrder);
    }

    /** Find a single item by id. Returns null when not found. */
    async findById(id: number | string): Promise<Item | null> {
        const item = store.find((it) => String(it.id) === String(id));
        return item ? { ...item } : null;
    }

    /**
     * Bulk-update sortOrder for a set of items.
     *
     * In a real PostgreSQL implementation this would be a single statement:
     *   UPDATE items SET sort_order = v.sort_order, updated_at = NOW()
     *   FROM (VALUES ($1,$2), ($3,$4), ...) AS v(id, sort_order)
     *   WHERE items.id = v.id;
     *
     * Wrapped in a transaction on the caller side to prevent race conditions.
     */
    async bulkUpdateSortOrder(updates: Array<{ id: number; sortOrder: number }>): Promise<void> {
        const now = new Date();
        for (const { id, sortOrder } of updates) {
            const item = store.find((it) => it.id === id);
            if (item) {
                item.sortOrder = sortOrder;
                item.updatedAt = now;
            }
        }
    }

    /** Expose raw store length for tests. */
    count(): number {
        return store.length;
    }

    /** Reset store to seed data — used in tests only. */
    __resetForTests(): void {
        store = seed();
    }
}

export const itemsRepository = new ItemsRepository();
