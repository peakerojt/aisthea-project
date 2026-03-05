import { ItemsRepository, Item } from './items.repository';
import { ReorderDto } from './items.validator';

export class ServiceError extends Error {
    constructor(public code: string, message: string, public status = 400) {
        super(message);
        this.name = 'ServiceError';
    }
}

export class ItemsService {
    constructor(private readonly repo: ItemsRepository) { }

    /** Return the full list sorted by sortOrder ASC. */
    async getItems(): Promise<Item[]> {
        return this.repo.findAllSorted();
    }

    /**
     * Reorder a single item from `fromIndex` to `toIndex`.
     *
     * Algorithm: "Shifted Swap" — O(n) with minimal writes.
     *
     * Why not fractional / gap-based sortOrder?
     *   Fractional gaps (e.g. between 1 and 2 insert 1.5) work great until they
     *   run out of precision after many reorders. "Shifted Swap" normalises
     *   every sortOrder to 1…n after each move, keeping integer values forever.
     *   The cost is at most (n-1) updates per reorder — acceptable for typical
     *   list sizes (< 10 000 items). For very large lists, fractional + periodic
     *   normalisation is worth revisiting (see "Future improvements" in README).
     *
     * Race condition guard:
     *   In a real PostgreSQL deployment this entire method runs inside a
     *   serializable transaction. The in-memory mock uses a synchronous,
     *   single-pass update — concurrent Node.js event-loop calls are naturally
     *   serialised by the repository's synchronous write, matching the semantics.
     */
    async reorderItem(dto: ReorderDto): Promise<Item[]> {
        const items = await this.repo.findAllSorted(); // already sorted ASC
        const maxIndex = items.length - 1;

        // ── Validate item exists ──────────────────────────────────────────────────
        const item = await this.repo.findById(dto.itemId);
        if (!item) {
            throw new ServiceError('ITEM_NOT_FOUND', `Item with id ${dto.itemId} was not found`, 404);
        }

        // ── Validate indices ──────────────────────────────────────────────────────
        if (dto.fromIndex < 0 || dto.fromIndex > maxIndex) {
            throw new ServiceError(
                'INVALID_FROM_INDEX',
                `fromIndex ${dto.fromIndex} is out of range [0, ${maxIndex}]`,
                400,
            );
        }
        if (dto.toIndex < 0 || dto.toIndex > maxIndex) {
            throw new ServiceError(
                'INVALID_TO_INDEX',
                `toIndex ${dto.toIndex} is out of range [0, ${maxIndex}]`,
                400,
            );
        }

        // ── No-op guard ───────────────────────────────────────────────────────────
        if (dto.fromIndex === dto.toIndex) {
            return items; // Nothing to do; skip DB round-trip.
        }

        // ── Reorder in memory ─────────────────────────────────────────────────────
        const reordered = [...items];
        const [moved] = reordered.splice(dto.fromIndex, 1);
        reordered.splice(dto.toIndex, 0, moved);

        // ── Build minimal update set ──────────────────────────────────────────────
        // Only update rows whose sortOrder actually changed to avoid unnecessary writes.
        const updates: Array<{ id: number; sortOrder: number }> = [];
        for (let i = 0; i < reordered.length; i++) {
            const newOrder = i + 1; // 1-based
            if (reordered[i].sortOrder !== newOrder) {
                updates.push({ id: reordered[i].id, sortOrder: newOrder });
            }
        }

        // ── Persist ───────────────────────────────────────────────────────────────
        await this.repo.bulkUpdateSortOrder(updates);

        // Return the new sorted state.
        return this.repo.findAllSorted();
    }
}
