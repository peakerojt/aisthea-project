# Import And Dependency Audit

Last reviewed: 2026-03-25

This note records the focused Phase G pass requested by
`AISTHEA_FULL_PROJECT_CLEANUP_GUIDE_EN.md`.

## Barrels And Aliases Reviewed

The remaining `index.ts` surfaces were re-checked:

- `client/src/types/index.ts`
  - Intentionally kept.
  - Reason: still used by shared client type imports such as `CartItem`,
    `AuthSession`, and storefront-facing contracts.
- `server/src/index.ts`
  - Intentionally kept.
  - Reason: server entry point, not a barrel clutter candidate.
- `server/src/i18n/index.ts`
  - Intentionally kept.
  - Reason: active runtime boundary for i18n initialization/helpers.
- `server/src/shared/validation/index.ts`
  - Intentionally kept.
  - Reason: active contract glue behind the client `@validation` alias.

## Deep Relative Import Review

The latest narrow scan found the deepest relative imports concentrated in:

- `server/src/modules/return-order/**`
- server-side tests that intentionally reach across legacy/shared boundaries

This is currently acceptable because the return-order module still lives inside a
hybrid modern/legacy server layout. The deep imports mostly resolve into:

- `shared/role-access`
- `shared/legacy-return-*.adapter`
- `utils/prisma`
- `generated/client`
- middleware/test scaffolding

These are architectural readability concerns, but they are not dead imports.

## Boundary Notes

### Client `@validation` alias

The client still imports validation contracts through:

- `@validation`

This remains intentional because `client/src/common/validation/schemas.ts`
adapts shared validation primitives from the server-side validation surface.

### Helper-style filenames reviewed

The following naming/boundary candidates were re-checked and intentionally kept:

- `client/src/common/utils/passwordValidation.ts`
  - Renamed from `validationUtils.ts` in this pass.
  - Reason: the file only wraps password-validation exports plus
    `calculatePasswordStrength`, so the clearer name keeps the same narrow
    ownership without widening scope.
- `client/src/common/utils/groupVariantsHelper.ts`
  - Active in product/admin variant flows.
- `server/src/modules/return-order/routes/return-request.route-helpers.ts`
  - Scoped only to the route layer it serves.
- `server/src/shared/legacy-return-create.adapter.ts`
- `server/src/shared/legacy-return-read.adapter.ts`
- `server/src/shared/legacy-return-write.adapter.ts`
  - These still reflect explicit legacy-compatibility ownership.

### Asset and generated placeholders reviewed

- `client/src/assets/images/.gitkeep`
  - Removed in this pass.
  - Reason: the directory already contains `vnpay-logo.png`, so the placeholder
    no longer serves a repository purpose.
- `client/src/assets/styles/.gitkeep`
  - Removed in this pass.
  - Reason: the directory was empty and had no active import references.
- `server/src/generated/query_engine-windows.dll.node.tmp*`
  - Removed locally in this pass.
  - Reason: these were Prisma temp artifacts, not tracked source files.

### Dead wrapper surfaces removed

- `client/src/common/hooks/useCategories.ts`
  - Removed in this pass.
  - Reason: usage scan plus GitNexus impact showed no current callers for
    `useCategoryTree`, `useCategoryFlat`, `useCreateCategory`,
    `useUpdateCategory`, or `useDeleteCategory`.
- `client/src/common/hooks/useOrders.ts`
  - Removed in this pass.
  - Reason: usage scan plus GitNexus impact showed no current callers for the
    exported order query/mutation hooks or `orderKeys`.
- `client/src/common/hooks/useReviews.ts`
  - Removed in this pass.
  - Reason: usage scan plus GitNexus impact showed no current callers for
    `useProductReviews`, `useCreateReview`, or `reviewKeys`.
- `server/src/modules/reviews/review.validator.ts`
  - Removed in this pass.
  - Reason: the wrapper only re-exported `createReviewSchema` and
    `CreateReviewInput` from `shared/validation/schemas/review`, while
    `review.routes.ts` was its sole caller.

## Safe Interpretation For Phase G

What is already true:

- dead client barrels were already removed in earlier cleanup slices
- remaining barrels and aliases still have real callers
- no obvious reversed `common -> pages` client dependency surfaced again

What still keeps Phase G open:

- the hybrid server layout still forces some deep relative imports
- duplicate abstractions may still exist, especially where legacy and modern
  return flows intentionally coexist

## Closure Note

The latest narrow pass removed the last clearly expendable import wrapper
(`server/src/modules/reviews/review.validator.ts`) without widening runtime
scope. The remaining deep imports now read as intentional hybrid-boundary
tradeoffs rather than cleanup clutter, so Phase G can be treated as closed for
the cleanup guide.

## Recommended Next Safe Steps

1. Avoid removing active barrels or aliases unless a replacement contract is
   introduced in the same slice.
2. Prefer documenting intentional hybrid boundaries over forcing path rewrites
   across legacy/modern server areas.
3. Revisit dependency cleanup only when a module boundary is already being
   touched for another low-risk cleanup or migration step.
