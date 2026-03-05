# Reorder Items Feature

Drag-and-drop (and keyboard) reordering of a list, with optimistic UI updates and server persistence.

---

## Architecture

```
server/src/modules/items/
├── items.route.ts        — Express router
├── items.controller.ts   — request / response handling
├── items.service.ts      — reorder algorithm + business rules
├── items.repository.ts   — data layer (in-memory mock; swap for Prisma/pg)
├── items.validator.ts    — Zod schemas
└── __tests__/
    └── items.service.test.ts

client/src/
├── services/items.service.ts      — Axios API client
├── hooks/useReorderItems.ts       — TanStack Query + optimistic update
└── components/items/
    ├── ItemList.tsx               — DnD context (pointer + keyboard sensors)
    ├── ItemRow.tsx                — sortable item row with drag handle
    └── items.css
client/src/pages/ItemsPage.tsx     — full page (loading/error/saving states)
```

---

## Reorder Algorithm — "Shifted Swap"

After a drag, all items are re-indexed in memory to `sortOrder = 1…n`. Only rows where `sortOrder` actually changed are written to the DB, making the update set minimal.

**Why not fractional gaps?** (e.g., `between 1 and 2 → insert 1.5`)
Fractional gaps exhaust floating-point precision after many reorders. Integer normalisation is always safe for lists < 100 000 items. For very large lists, consider fractional + periodic normalisation.

**Race condition guard (PostgreSQL):** The entire `reorderItem` transaction runs inside a
`SERIALIZABLE` / `BEGIN … COMMIT` block. The unique index on `sort_order` prevents two concurrent writes from leaving the table in an inconsistent state (one will receive a unique-constraint error, which the client retries). The in-memory mock naturally serialises writes via the synchronous event loop.

---

## Running Locally

### Backend

```bash
cd server
npm install
npm run dev        # ts-node, hot-reload on :5000
```

### Frontend

```bash
cd client
# .env.local already contains VITE_API_URL=http://localhost:5000
npm install
npm run dev        # Vite dev server on :3000
```

Navigate to **http://localhost:3000/items** to see the drag-and-drop list.

---

## Running Tests

```bash
cd server
npm test -- --testPathPattern="items.service"
# or run all tests:
npm test
```

Expected output:
```
PASS src/modules/items/__tests__/items.service.test.ts
  ItemsService.reorderItem
    ✓ moves an item from position 1 to position 3
    ✓ returns items with sequential sortOrders after reorder
    ✓ is a no-op when fromIndex === toIndex
    ✓ moves item to the first position (toIndex = 0)
    ✓ moves item to the last position (toIndex = maxIndex)
    ✓ handles a list with a single item (no-op)
    ✓ throws ITEM_NOT_FOUND when itemId does not exist
    ✓ throws INVALID_FROM_INDEX when fromIndex is negative
    ✓ throws INVALID_FROM_INDEX when fromIndex exceeds list length
    ✓ throws INVALID_TO_INDEX when toIndex is out of range
    ✓ maintains correct order after multiple consecutive reorders
  ItemsService.getItems
    ✓ returns items sorted by sortOrder ASC
    ✓ returns empty array when no items exist
```

---

## API Reference

### GET /api/items
Returns all items sorted by `sortOrder` ASC.

**Response 200**
```json
{
  "success": true,
  "data": [
    { "id": 1, "title": "Task Alpha", "sortOrder": 1, "createdAt": "...", "updatedAt": "..." }
  ],
  "message": "OK"
}
```

### PATCH /api/items/reorder
Moves one item from `fromIndex` to `toIndex` (both 0-based).

**Body**
```json
{
  "itemId": 3,
  "fromIndex": 2,
  "toIndex": 0
}
```

**Response 200** — same shape as GET but with the updated list.

**Error codes**
| HTTP | code | Meaning |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | body failed Zod schema |
| 400 | `INVALID_FROM_INDEX` | fromIndex out of range |
| 400 | `INVALID_TO_INDEX` | toIndex out of range |
| 404 | `ITEM_NOT_FOUND` | itemId does not exist |
| 500 | `INTERNAL_ERROR` | unexpected server error |

---

## Potential Improvements

| Area | Idea |
|------|------|
| **Scalability** | Fractional `sortOrder` + periodic normalisation for large lists |
| **Performance** | Virtualized list (`@tanstack/react-virtual`) for > 500 items |
| **Pagination** | Cursor-based paging on `GET /api/items` |
| **Bulk reorder** | Accept array of `{ id, sortOrder }` for multi-item moves |
| **Real DB** | Replace in-memory repo with Prisma using the included schema |
| **Auth** | Guard reorder PATCH behind middleware if list is user-specific |
| **Real-time** | Broadcast socket events so multi-user lists stay in sync |
