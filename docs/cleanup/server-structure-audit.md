# Server Structure Audit

Last reviewed: 2026-03-25

This note records the current server cleanup state required by Phase D of
`AISTHEA_FULL_PROJECT_CLEANUP_GUIDE_EN.md`.

## Current Shape

The server is still intentionally hybrid.

### Module-owned domains already readable

These areas already follow the preferred `modules/<domain>/...` pattern well
enough to be treated as the modern direction:

- `server/src/modules/auth/`
- `server/src/modules/cart/`
- `server/src/modules/chat/`
- `server/src/modules/categories/`
- `server/src/modules/items/`
- `server/src/modules/order/`
- `server/src/modules/payments/`
- `server/src/modules/products/`
- `server/src/modules/purchase-orders/`
- `server/src/modules/return-order/`
- `server/src/modules/tracking/`
- `server/src/modules/users/`

### Root-level legacy or bridge-owned surfaces still active

The following root-level folders still have real runtime purpose and should not
be treated as dead clutter:

- `server/src/controllers/`
- `server/src/routes/`
- `server/src/services/`
- `server/src/middlewares/`
- `server/src/shared/`

This is especially visible in `server/src/app.ts`, where module-owned routes
and legacy/root routes are mounted side-by-side.

## Return / Refund Hybrid Boundary

The return/refund area is the clearest example of intentional coexistence:

- modern route family:
  - `server/src/modules/return-order/routes/return-request.routes.ts`
  - `server/src/modules/return-order/routes/return-request.customer-routes.ts`
  - `server/src/modules/return-order/routes/return-request.admin-routes.ts`
- legacy compatibility route family:
  - `server/src/routes/return.routes.ts`
  - `server/src/routes/return.customer-routes.ts`
  - `server/src/routes/return.admin-routes.ts`
- legacy compatibility controllers:
  - `server/src/controllers/return.controller.ts`
  - `server/src/controllers/return.legacy-controller.ts`
  - `server/src/controllers/return.customer-handlers.ts`
  - `server/src/controllers/return.admin-handlers.ts`
  - `server/src/controllers/return.order-handlers.ts`

These files are not accidental duplication. They preserve the intentional
modern-vs-legacy boundary documented in
`docs/decisions/legacy-return-create-boundary.md`.

## Routes and Controllers Still Outside Modules

The following root-owned surfaces are still structurally notable and should be
reviewed before Phase D is considered closed:

- RBAC routes/controllers:
  - `server/src/routes/role.routes.ts`
  - `server/src/routes/permission.routes.ts`
  - `server/src/controllers/role.controller.ts`
- legacy order/return/refund compatibility routes/controllers
- root services that still act as legacy or cross-domain infrastructure:
  - `server/src/services/return.service.ts`
  - `server/src/services/refund.service.ts`
  - `server/src/services/importExport.service.ts`

## Reviewed Cleanup Candidates

These notable items were re-checked during the cleanup-guide pass:

- `server/src/utils/schemas/src/generated/`
  - Removed in this pass.
  - Reason: no runtime imports pointed at this subtree, while the active Prisma client imports all resolve through `server/src/generated/`.
- `server/src/modules/return-order/routes/return-request.route-helpers.ts`
  - Intentionally kept.
  - Reason: its helpers are only used by the modern return-request route layer, so the name still matches current ownership.
- `server/database/03_seed_data_standard_fixed.sql`
  - Intentionally kept.
  - Reason: `server/database/00_run_all_full_reset.sql` still invokes it directly, so it is active database tooling rather than dead clutter.
- `server/src/shared/validation/index.ts`
  - Intentionally kept.
  - Reason: the client `@validation` alias still points at this barrel as the shared validation contract surface.

## Intentionally Untouched High-Risk Areas

These remain documented no-refactor zones for cleanup:

- `server/src/app.ts`
- `server/src/services/return.service.ts`

For cleanup-guide purposes, these should be protected by documentation and
tests rather than structurally rewritten during the cleanup pass.

## Safe Interpretation For Phase D

What is already true:

- controllers, services, routes, and tests are distinguishable
- server test placement is predictable through `__tests__`
- modern modules are visibly separate from legacy bridges
- no obvious dead root server files were identified in this pass

What still keeps Phase D open:

- root-level legacy surfaces are still broad and should be explicitly reviewed
  as “intentionally active” vs “future extraction candidates”
- some helper-style naming in bridge areas still needs judgment, not blind
  renaming
- `app.ts` mount coexistence remains documented but not structurally simplified

## Recommended Next Safe Cleanup Steps

1. Keep documenting intentional root-level legacy/bridge files instead of
   renaming them into canonical modern names.
2. Prefer route/controller/service tests and boundary notes over moving
   high-risk runtime files.
3. Only extract or delete a root-level server file if import/route ownership is
   unambiguous and GitNexus blast radius stays low.

## Closure Note

After the latest gate review:

- no empty directories remain under `server/src`
- no additional low-trust tracked server filenames surfaced strongly enough to
  justify another cleanup slice
- `npm run build` in `server/` still passes after the duplicate-generated
  subtree cleanup

This is enough to treat Phase D as closed for the cleanup guide. Future server
structure changes should now be driven by bounded feature/migration work rather
than broad cleanup pressure.
