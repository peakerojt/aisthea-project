import { ItemsService, ServiceError } from '../items.service';
import { ItemsRepository } from '../items.repository';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a fresh service with an isolated, reset repository for each test. */
function makeService() {
    const repo = new ItemsRepository();
    repo.__resetForTests(); // seed: [Alpha, Beta, Gamma, Delta, Epsilon], sortOrder 1..5
    return new ItemsService(repo);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ItemsService.reorderItem', () => {
    // ── Normal reorder ──────────────────────────────────────────────────────────

    it('moves an item from position 1 to position 3 (0-based index)', async () => {
        const svc = makeService();
        const items = await svc.reorderItem({ itemId: 2, fromIndex: 1, toIndex: 3 });

        // Beta (id=2) should now be at sortOrder 4 (index 3 → 1-based 4)
        const titles = items.map((it) => it.title);
        expect(titles).toEqual(['Task Alpha', 'Task Gamma', 'Task Delta', 'Task Beta', 'Task Epsilon']);
    });

    it('returns items with sequential sortOrders after reorder', async () => {
        const svc = makeService();
        const items = await svc.reorderItem({ itemId: 3, fromIndex: 2, toIndex: 0 });
        const orders = items.map((it) => it.sortOrder);
        expect(orders).toEqual([1, 2, 3, 4, 5]);
    });

    it('is a no-op when fromIndex === toIndex', async () => {
        const svc = makeService();
        const before = await svc.getItems();
        const after = await svc.reorderItem({ itemId: 1, fromIndex: 0, toIndex: 0 });
        expect(after.map((i) => i.id)).toEqual(before.map((i) => i.id));
    });

    // ── Edge: move to first / last position ─────────────────────────────────────

    it('moves item to the first position (toIndex = 0)', async () => {
        const svc = makeService();
        const items = await svc.reorderItem({ itemId: 5, fromIndex: 4, toIndex: 0 });
        expect(items[0].title).toBe('Task Epsilon');
        expect(items[0].sortOrder).toBe(1);
    });

    it('moves item to the last position (toIndex = maxIndex)', async () => {
        const svc = makeService();
        const items = await svc.reorderItem({ itemId: 1, fromIndex: 0, toIndex: 4 });
        expect(items[4].title).toBe('Task Alpha');
        expect(items[4].sortOrder).toBe(5);
    });

    // ── Edge: single item list ───────────────────────────────────────────────────

    it('handles a list with a single item (no-op)', async () => {
        const repo = new ItemsRepository();
        repo.__resetForTests();
        // Manually slim the store down to 1 item via multiple reorders is complex:
        // Instead, spy on findAllSorted to return 1 item.
        jest.spyOn(repo, 'findAllSorted').mockResolvedValueOnce([
            { id: 1, title: 'Only', sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
        ]);
        jest.spyOn(repo, 'findById').mockResolvedValueOnce({
            id: 1, title: 'Only', sortOrder: 1, createdAt: new Date(), updatedAt: new Date(),
        });

        const svc = new ItemsService(repo);
        const items = await svc.reorderItem({ itemId: 1, fromIndex: 0, toIndex: 0 });
        expect(items).toHaveLength(1);
    });

    // ── Error: item not found ───────────────────────────────────────────────────

    it('throws ITEM_NOT_FOUND when itemId does not exist', async () => {
        const svc = makeService();
        await expect(
            svc.reorderItem({ itemId: 9999, fromIndex: 0, toIndex: 1 }),
        ).rejects.toMatchObject({ code: 'ITEM_NOT_FOUND', status: 404 });
    });

    // ── Error: invalid fromIndex ────────────────────────────────────────────────

    it('throws INVALID_FROM_INDEX when fromIndex is negative', async () => {
        const svc = makeService();
        await expect(
            svc.reorderItem({ itemId: 1, fromIndex: -1, toIndex: 2 }),
        ).rejects.toMatchObject({ code: 'INVALID_FROM_INDEX', status: 400 });
    });

    it('throws INVALID_FROM_INDEX when fromIndex exceeds list length', async () => {
        const svc = makeService();
        await expect(
            svc.reorderItem({ itemId: 1, fromIndex: 99, toIndex: 2 }),
        ).rejects.toMatchObject({ code: 'INVALID_FROM_INDEX', status: 400 });
    });

    // ── Error: invalid toIndex ──────────────────────────────────────────────────

    it('throws INVALID_TO_INDEX when toIndex is out of range', async () => {
        const svc = makeService();
        await expect(
            svc.reorderItem({ itemId: 1, fromIndex: 0, toIndex: 99 }),
        ).rejects.toMatchObject({ code: 'INVALID_TO_INDEX', status: 400 });
    });

    // ── Multiple sequential reorders ────────────────────────────────────────────

    it('maintains correct order after multiple consecutive reorders', async () => {
        const svc = makeService();

        // Move Alpha to end
        await svc.reorderItem({ itemId: 1, fromIndex: 0, toIndex: 4 });
        // Move Epsilon (now at index 3) to beginning
        await svc.reorderItem({ itemId: 5, fromIndex: 3, toIndex: 0 });

        const items = await svc.getItems();
        const sortOrders = items.map((i) => i.sortOrder);
        // sortOrders must always be 1-5 in strict increasing order
        expect(sortOrders).toEqual([1, 2, 3, 4, 5]);
        expect(items[0].title).toBe('Task Epsilon');
    });
});

describe('ItemsService.getItems', () => {
    it('returns items sorted by sortOrder ASC', async () => {
        const svc = makeService();
        const items = await svc.getItems();
        for (let i = 1; i < items.length; i++) {
            expect(items[i].sortOrder).toBeGreaterThan(items[i - 1].sortOrder);
        }
    });

    it('returns empty array when no items exist', async () => {
        const repo = new ItemsRepository();
        jest.spyOn(repo, 'findAllSorted').mockResolvedValueOnce([]);
        const svc = new ItemsService(repo);
        const items = await svc.getItems();
        expect(items).toEqual([]);
    });
});
