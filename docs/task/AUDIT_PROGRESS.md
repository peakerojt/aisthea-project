# Audit Progress

Last updated: 2026-03-25

## Legend

- `[Done]` Completed and verified
- `[In Progress]` Started, but not fully migrated/closed
- `[Pending]` Not started yet
- `[High Risk]` Needs extra caution because GitNexus reported high/critical blast radius

## Current Snapshot

- Worktree: clean after completing the dedicated cleanup-only pass from `AISTHEA_FULL_PROJECT_CLEANUP_GUIDE_EN.md`
- GitNexus: working and refreshed after each commit
- Strategy: small slices, test-first on risky areas, refactor only after impact analysis
- Migration phase:
  - Read-path migration from legacy return reads to `return-order`: done
  - Write/admin action migration from legacy return/refund flows: safe fallback bridges are in place; only ambiguous multi-item create policy remains pending and higher-risk

## Cleanup Baseline

- Cleanup guide source: `AISTHEA_FULL_PROJECT_CLEANUP_GUIDE_EN.md` reviewed from NotebookLM before resuming implementation work
- Baseline capture:
  - `git status` showed a clean code worktree plus one active untracked checklist doc: `AISTHEA_IMPLEMENTATION_CHECKLIST_EN.md`
  - no additional root-level temporary/generated artifacts were selected for deletion in this pass
- Cleanup scope for this pass:
  - documentation/progress synchronization
  - removing stale stop-point notes
  - normalizing the active checklist file into the repo
  - restoring `docs/` as a tracked documentation location instead of a globally ignored folder
  - moving i18n reference docs out of `client/src/` into tracked project docs
  - keeping runtime behavior unchanged

## Cleanup Outcome

- Moved:
  - `client/src/i18n/docs/` -> `docs/i18n/`
- Cleanup crosswalk:
  - current cleanup-guide phase mapping now lives in `docs/cleanup/cleanup-guide-crosswalk.md`
  - server cleanup-phase audit now lives in `docs/cleanup/server-structure-audit.md`
  - test clutter review now lives in `docs/cleanup/test-clutter-audit.md`
  - import/dependency review now lives in `docs/cleanup/import-dependency-audit.md`
  - gate review now considers `D. Server Cleanup` and `E. Test Cleanup` closed
  - the latest import-boundary pass now considers `G. Import and Dependency Cleanup` closed
- Restored/normalized:
  - `docs/` is tracked again as an active project documentation location
  - `README.md`, `ARCHITECTURE.md`, `AUDIT_PROGRESS.md`, and `AISTHEA_IMPLEMENTATION_CHECKLIST_EN.md` are now the intended top-level source-of-truth docs
- Reviewed and intentionally kept:
  - `scripts/i18n-checker.mjs` and `scripts/i18n-unused-baseline.json` because they still back active root scripts
  - `server/src/generated/` as ignored generated output via `server/.gitignore`, not as tracked source
  - `server/src/shared/validation/index.ts` as the active barrel behind the client `@validation` alias
  - `client/src/common/utils/passwordValidation.ts` as the clarified replacement for the former `validationUtils.ts` wrapper
  - `client/src/common/utils/groupVariantsHelper.ts` as an intentionally kept active helper because renaming it currently widens the blast radius into product/admin variant flows
  - `server/src/modules/return-order/routes/return-request.route-helpers.ts` because it still matches route-layer ownership
  - `server/database/03_seed_data_standard_fixed.sql` because the full-reset SQL runner still invokes it directly
  - `client/src/types/index.ts`, `server/src/index.ts`, and `server/src/i18n/index.ts` as active entry/barrel surfaces rather than dead facades
- legacy/high-risk runtime files unchanged during cleanup: `server/src/app.ts`, `server/src/services/return.service.ts`, and `client/src/admin/components/OrderActionPanel.tsx:executeTransition`
- Deleted/removed in this pass:
  - no runtime source files
  - no uncertain scripts or helpers
  - dead duplicate generated subtree `server/src/utils/schemas/src/generated/`
  - unused tracked asset placeholders `client/src/assets/images/.gitkeep` and `client/src/assets/styles/.gitkeep`
  - local Prisma temp artifacts `server/src/generated/query_engine-windows.dll.node.tmp*`
  - dead client hook wrappers `client/src/common/hooks/useCategories.ts` and `client/src/common/hooks/useOrders.ts`
  - dead client hook wrapper `client/src/common/hooks/useReviews.ts`
  - thin server review-schema wrapper `server/src/modules/reviews/review.validator.ts`
- Structural audit result:
  - no tracked `Temp` / `New` / `v2` / `fixed` style source filenames were selected for cleanup
  - admin feature test placement is now standardized by layer: `components/__tests__`, `pages/__tests__`, `hooks/__tests__`, `utils/__tests__`
  - common component tests are now grouped under `common/components/__tests__`, checkout prop contracts under `common/types/`, and the i18next type augmentation under `client/src/i18n/`
  - broader client-side test placement is now standardized for the remaining mixed feature folders as well: `app/__tests__`, `common/hooks/__tests__`, `common/pages/__tests__`, `common/services/__tests__`, `common/utils/__tests__`, `common/validation/__tests__`, `store/pages/__tests__`, and `store/utils/__tests__`
  - `client/src/store/components/tracking.store.ts` was relocated to `client/src/store/state/tracking.store.ts` so Zustand state no longer sits inside a UI component folder
  - no remaining client/server directories currently mix colocated runtime files with `*.test.*` siblings outside `__tests__`
  - the dead `client/src/store/components/index.ts` barrel was removed after confirming no callers remained
  - the dead `client/src/common/hooks/index.ts` barrel was also removed after confirming no `@/common/hooks` callers remained in the client source tree
  - the dead `client/src/common/hooks/useCategories.ts` and `client/src/common/hooks/useOrders.ts` wrappers were removed after usage scans plus GitNexus impact confirmed no current callers for their exported hooks
  - the dead `client/src/common/hooks/useReviews.ts` wrapper was also removed after usage scans plus GitNexus impact confirmed no current callers for its exported hooks
  - the dead `server/src/modules/reviews/review.validator.ts` wrapper was removed after caller verification showed `review.routes.ts` could import the shared schema directly
  - legacy root folders `client/src/components/` and `client/src/pages/` were collapsed away after moving their last CSS assets into `client/src/common/styles/components/ItemRow.css` and `client/src/common/styles/pages/ItemsPage.css`
  - `client/src/setupTests.ts` was intentionally kept at the root as the shared Vitest/JSDOM setup entry point
  - `OrderTimeline.test.tsx` now uses explicit behavior-focused test names instead of vague timeline smoke wording
  - the final Phase I verification pass also normalized four lingering test-only hygiene issues: `OrderActionPanel.test.tsx`, `RecentOrders.test.tsx`, and `OrderTimeline.test.tsx` now explicitly clean up DOM between tests, while `ReturnDetail.test.tsx` now avoids a duplicate-text assertion that became ambiguous after UI cleanup
  - final verification status is now explicit: client build, client lint, server build, full client Vitest, and full server Jest are green; `npm run i18n:check` still reports 34 missing client keys and 505 new unused client keys vs baseline, with 0 new hardcoded active-route strings vs baseline

## Current Migration Boundary

- Legacy create route `/api/orders/:id/return` still accepts order-level `reason + proofImages`
- Modern create route `/api/return-requests` requires itemized `items + attachments`
- Safe bridge cases are enabled only when the system can derive exactly one valid return item selection
- Ambiguous multi-item legacy create intentionally stays on the legacy service path
- Decision doc: [docs/decisions/legacy-return-create-boundary.md](./docs/decisions/legacy-return-create-boundary.md)

## Open Decisions

- `[Decided]` Keep the current migration boundary for ambiguous multi-item legacy create in this phase
  - Rationale: the legacy create contract still does not express item selection, so bridging multiple returnable items would guess customer intent
  - Future work: only open a new migration phase after product/API define an explicit item-selection contract or the client fully moves to `/api/return-requests`

## Blocked By Product/API

- Ambiguous multi-item legacy create cannot be fully migrated while the legacy request body remains order-level (`reason + proofImages`)
- The modern `return-order.createReturnRequest` contract requires item-level selection (`items + attachments`)
- Any deeper migration here is blocked on contract design, not on low-level controller cleanup

## Checklist

### Architecture

- `[Done]` Add architecture baseline in [ARCHITECTURE.md](./ARCHITECTURE.md)
- `[Done]` Document the intentional legacy multi-item create boundary in [docs/decisions/legacy-return-create-boundary.md](./docs/decisions/legacy-return-create-boundary.md)
- `[Done]` Record the current ambiguous multi-item create strategy as a decided boundary for this phase
- `[Done]` Add migration boundary, open decisions, and product/API blockers to this audit file
- `[In Progress]` Keep this checklist updated as the source of truth for audit progress

### Client: Checkout

- `[Done]` Split checkout page into hooks
- `[Done]` Split checkout UI into section components
- `[Done]` Centralize checkout prop/types contract
- `[Done]` Improve checkout type-safety
- `[Done]` Add hook-level tests for form, pricing, and submit flows

### Client: Return / Refund

- `[Done]` Consolidate customer return request flows onto shared service/api contracts
- `[Done]` Consolidate admin return review/orchestration
- `[Done]` Add tests for return service, admin hook, admin modal, create page, and detail page
- `[Done]` Canonicalize client return statuses away from legacy aliases in shared service mapping
- `[In Progress]` Audit client return/refund wording mismatches in [docs/audits/client-return-wording-mismatch.md](./docs/audits/client-return-wording-mismatch.md)
  Current status: mismatch list exists and low-risk wording/status cleanup now covers customer detail, timeline, create form copy, create-form validation copy, admin review modal labeling, shared badge status normalization, shared payment badge/method labels now falling back to Vietnamese defaults when `enums.*` returns raw keys, hook/service feedback-message keying, reject-note enforcement in the shared admin return service, dashboard recent-order status labels plus raw-key fallback-safe dashboard chrome, tracking-page lookup/load error copy plus canonical `RETURN_REQUESTED` tracking status handling, `TrackingDetailPage` page chrome and return-related status labels now stay readable even when `tracking.*` returns raw keys, admin/store order timelines now keep empty-state copy readable even when `orders.*` / `tracking.*` return raw keys, the admin order-detail page now keeps top-level chrome, section headings, metadata labels, guest-customer copy, and delivery-proof labels readable even when `pages.adminOrderDetail.*` returns raw keys, the admin orders page now keeps page chrome, filter labels, compact status/payment labels, table headers, item-count copy, and range summary readable even when `orders.*` returns raw keys, the shared customer order-detail `OrderHeader`, `OrderPricingSummary`, `OrderItemsTable`, and `ShippingAddressCard` components now also keep section chrome, item-count/review labels, and the shipping-address heading readable when `pages.orderDetail.*` returns raw keys, the `PaymentQR` page now keeps header chrome, QR alt text, total/countdown labels, guidance copy, supported-bank heading, and scanned CTA readable when `pages.paymentQR.*` returns raw keys, the shared `CheckoutPaymentSection` now keeps the payment section title, description, payment-method legend, and VNPAY/COD labels readable when `pages.checkout.*` returns raw keys, the shared `CheckoutSummaryRail` now keeps the summary title, coupon CTA/remove labels, subtotal/shipping/discount/total labels, free-shipping text, and cart/place-order CTAs readable when `pages.checkout.*` returns raw keys, `adminReturn.utils` now falls back to canonical Vietnamese labels when `returns.status.*` is unavailable, admin tracking page chrome now stays readable even when `pages.adminTracking.*` is unavailable, order-detail tracking CTA visibility for `RETURN_REQUESTED` / `Returned`, admin order status surfaces that previously fell back to pending-style meta for `RETURN_REQUESTED`, admin order actions that previously lost the `Returned` transition when current status came back as `RETURN_REQUESTED`, admin order-action note/confirm dialogs now keep cancel/return wording readable even when the `orders.statusDialog.*` namespace is unavailable, the admin delivery-proof dialog now keeps shipping-confirmation headings, upload guidance, review copy, and CTA labels readable even when the same namespace is unavailable, customer order-header chrome moved to i18n with safe fallback labels, customer order pricing/items chrome moved to `pages.orderDetail.*` with safe fallback labels, the customer shipping-address section now reads from `pages.orderDetail.shippingAddress` with a safe fallback label, `OrderDetailPage` now keeps hero/error/action copy human-readable even when the page namespace is unavailable and now also interpolates templated buy-again fallback copy safely, the customer review modal now reads all chrome from `pages.orderDetail.reviewModal.*` with safe fallbacks and now also interpolates star-count fallback labels safely, the customer order-list page now keeps `myOrders.*` chrome human-readable even if that namespace is unavailable and now explicitly covers the raw-key fallback path in tests, `TrackingLookupPage` now keeps hero/form/action/error copy human-readable even if `trackingLookup.*` is unavailable and now explicitly covers the raw-key fallback path in tests, `OrderSuccess` now keeps confirmation/summary/follow-up copy human-readable even if `orderSuccess.*` is unavailable and now also interpolates summary/order-id fallback copy safely, `VNPayReturn` plus shared payment-status fallbacks now stay human-readable even when `vnpayReturn.*` / `checkoutFlow.*` namespaces are unavailable and now also interpolate summary-count fallback copy safely, the admin `RefundDialog` now keeps refund headings/form/CTA/feedback copy readable even if the `orders.refund.*` namespace is unavailable and now also interpolates templated fallback copy safely, `OrderFinancials` now keeps refund-history/table/method/status chrome readable even if the same namespace is unavailable and now also interpolates transaction-count fallback copy safely, `CreateReturnPage` now guards invalid route ids while locking the create-to-detail bridge flow with dedicated tests, `CreateReturnRequest` now also keeps form chrome, schema validation copy, header subtitle, item fallback labels, purchased-quantity text, and attachment alt text readable even when the `returns.*` namespace is unavailable, the admin `Returns` page plus `useAdminReturns` tab/feedback labels now stay readable even when the `returns.*` namespace is unavailable and now also interpolate templated fallback copy safely, `StatusBadge` and `ReturnTimeline` now also keep canonical status labels, legacy log comments, and actor/status helper copy readable even when the `returns.*` namespace is unavailable, `ReturnDetail`, `ReturnItemsTable`, and `AdminReturnReviewModal` now keep section labels and dynamic proof/item copy readable even when the `returns.*` namespace is unavailable, `ReasonLabel` now falls back to the raw reason code instead of exposing `reasons.*`, and `SupportPage` plus the admin `Tracking` page now keep page chrome readable even when `pages.support.*` / `pages.adminTracking.*` namespaces return raw keys in partial-loading scenarios
- `[In Progress]` Full migration away from legacy return/refund client assumptions
  Current status: shared client service now uses the shared `normalizeReturnStatus` helper, legacy aliases like `PENDING_APPROVAL` / `COMPLETED` are now canonicalized more defensively even when casing or spacing drifts in API payloads, `returnService.detail()` now also normalizes nested `statusLogs` so consumers do not need to interpret legacy aliases at render-time, and the legacy order-linked/service create paths (`request`, `create`, `getForOrder`) now canonicalize those aliases before returning client-facing records
  Remaining gap: some client screens and labels still carry legacy wording/assumptions even though the shared mapping layer is now canonical

### Client: Auth / Session

- `[Done]` Cover API refresh/session behavior with tests
- `[Done]` Cover OAuth callback behavior with tests
- `[Done]` Cover auth event listener behavior with tests

### Server: Payments / VNPay

- `[Done]` Extract VNPay service and utils from controller
- `[Done]` Cover VNPay controller, service, and utils with tests
- `[Done]` Cover payment route wiring with tests

### Server: Return Request Module

- `[Done]` Share return request status/types
- `[Done]` Cover validator, repository, routes, controller, and service with tests
- `[Done]` Simplify controller flow with shared action/error handling
- `[Done]` Tighten repository pagination/filter helpers
- `[Done]` Share role access helpers across routes and controller
- `[Done]` Share return-request route role sets from shared helper
- `[Done]` Lock creator role contract on modern return-request create route
- `[Done]` Cover modern return-request route wiring for my/detail/admin action routes
- `[Done]` Split modern return-request route wiring into customer/admin subrouters
- `[Done]` Streamline transition + notification flow in service
- `[Done]` Cover controller happy paths for create and my-returns pagination
- `[Done]` Cover controller happy paths for admin list, approve, and mark-received actions
- `[Done]` Cover controller detail not-found, reject success, and admin-list validation contracts
- `[Done]` Cover controller refund validation and service-error contracts
- `[Done]` Split modern return-request controller into customer/admin handlers with compatibility shim
- `[Done]` Collapse modern return-request controller to compatibility shim
- `[Done]` Cover repository include contracts for create and detail reads
- `[Done]` Cover service query wrappers for my/detail/admin return reads
- `[Done]` Cover service edge cases for forbidden create, expired windows, missing items, and invalid state transitions
- `[Done]` Cover refund service guards for missing requests and invalid refund state
- `[Done]` Add `orderId` lookup path in `return-order` repository/service for migration prep
- `[Done]` Enrich `return-order` customer list reads with order and attachment data for migration prep
- `[Done]` Enrich `return-order` admin list reads with customer and attachment data for migration prep
- `[Done]` Share legacy return read adapters across controller and routes
- `[Done]` Centralize legacy read fallback shaping in shared adapter
- `[Done]` Complete low-risk route/controller cleanup inside `return-order`

### Server: Legacy Return / Refund

- `[Done]` Increase tests for `parseProofImages`
- `[Done]` Increase pagination/filter tests for legacy return read path
- `[Done]` Add controller and service tests for legacy refund flow
- `[Done]` Simplify legacy refund controller
- `[Done]` Harden legacy refund service guards with tests
- `[Done]` Add routes/controller/service tests for legacy return flow
- `[Done]` Lock legacy `getOrderReturn` response contract with controller tests
- `[Done]` Add legacy `getOrderReturn` fallback to `return-order` read path
- `[Done]` Add legacy `/api/returns/my` fallback to `return-order` customer list read path
- `[Done]` Add legacy `/api/returns/:id` fallback to `return-order` detail read path
- `[Done]` Add legacy `/api/returns` admin list fallback to `return-order` admin read path
- `[Done]` Lock dual-route coexistence for legacy create `/api/orders/:id/return` and modern create `/api/return-requests`
- `[Done]` Add conservative legacy create adapter draft for single-item migration prep
- `[Done]` Add service-level legacy-compatible create path for safe single-item orders
- `[Done]` Bridge legacy create controller to compatibility path for safe single-item orders
- `[Done]` Preserve ServiceError envelopes in bridged single-item legacy create flow
- `[Done]` Extend safe legacy create compatibility to multi-item orders with exactly one remaining returnable item
- `[Done]` Lock no-returnable-item legacy create boundary with service tests
- `[Done]` Lock fallback refund sequencing for requested, approved, and received modern return states
- `[Done]` Lock fallback process error envelopes for modern approve/refund failures
- `[Done]` Centralize legacy write fallback orchestration in shared adapter
- `[Done]` Centralize legacy create fallback orchestration in shared adapter
- `[Done]` Centralize legacy customer route fallback shaping in shared adapter
- `[Done]` Extract legacy customer return route handlers from route wiring
- `[Done]` Extract legacy admin return handlers from controller surface
- `[Done]` Extract legacy order/create handlers from controller surface
- `[Done]` Collapse legacy return controller to compatibility shim
- `[Done]` Split legacy return route wiring into customer/admin subrouters
- `[Done]` Harden legacy return routes and controller
- `[Done]` Expand legacy return service coverage
- `[In Progress]` Migrate legacy return/refund behavior toward `return-order`
  Current status: read migration is complete; safe write fallback bridges are in place for `patchProcessReturn`, safe single-item legacy create, and multi-line orders that have exactly one remaining returnable item
  Remaining deeper migration: ambiguous multi-item legacy create still cannot move fully because the legacy contract is order-level (`reason + proofImages`) while `return-order.createReturnRequest` requires itemized payload (`items + attachments`)
  Blocker for create flow: legacy `postReturnRequest` accepts order-level `reason + proofImages`, while `return-order.createReturnRequest` requires itemized payload with `items + attachments`
  Current stabilization state: shared draft adapter + service compatibility path now power all unambiguous create cases and explicitly reject no-item/ambiguous item states, while ambiguous multi-item legacy create intentionally stays on legacy service

### Server: Route Coexistence / App Wiring

- `[Done]` Lock order route wiring with tests
- `[Done]` Lock tracking route wiring with tests
- `[Done]` Lock role and permission route wiring with tests
- `[Done]` Cover role and permission controller contracts with tests
- `[Done]` Lock app-level coexistence for `/api/orders`, `/api/returns`, and `/api/return-requests`
- `[Done]` Lock app-level coexistence for legacy and modern return create routes during migration
- `[High Risk]` Refactor [server/src/app.ts](./server/src/app.ts) directly

### Server: Tracking

- `[Done]` Cover tracking route wiring with tests
- `[Done]` Cover tracking controller behavior with focused unit tests

## Risk Notes

- `[High Risk]` Legacy [server/src/services/return.service.ts](./server/src/services/return.service.ts)
  - `parseProofImages` was reported as `CRITICAL`
  - `getPagination` was reported as `HIGH`
  - current stabilization note: `parseProofImages` parsing branches for empty arrays, nullish values, object JSON, and malformed JSON are now locked by focused service tests
  - current stabilization note: legacy `listReturns` pagination/filter behavior is now locked for default pagination, invalid input clamping, last-page reads, empty filtered reads, and normalized response shape
- `[High Risk]` [server/src/app.ts](./server/src/app.ts)
  - `createApp` was reported as `HIGH`

## Resume Point

- Cleanup outcome target:
  - completed
  - worktree is clean and docs now match the intended cleanup baseline
- Next safe resumption point:
  - resume `AISTHEA_IMPLEMENTATION_CHECKLIST_EN.md` from the next bounded low-risk unfinished area
  - preferred order: `2.1` wording audit follow-up, `2.3` legacy UI assumptions, `2.4` UI test hardening, then `3.4` bridge/fallback review notes
  - keep any new structure cleanup and feature work in separate commits
- Keep direct refactors paused in:
  - `client/src/admin/components/OrderActionPanel.tsx:executeTransition`
  - `server/src/services/return.service.ts`
  - `server/src/app.ts`

## Suggested Next Steps

1. Decide whether to stop at the current stabilized migration boundary or open a new phase for ambiguous multi-item legacy create migration.
2. Delay direct refactors in legacy `return.service.ts` and `app.ts` until more isolation or migration scaffolding is in place.
3. If continuing on client return/refund, target remaining legacy wording/assumptions in UI now that shared service status mapping is canonical.
4. Keep updating this file in the same commit whenever a checklist item changes state.

## Commit Trail

- `353a33c` `refactor: extract vnpay payment service`
- `520a29c` `refactor: consolidate return request client flows`
- `ba1d7dd` `test: cover client auth session flows`
- `732a9e7` `refactor: share return request status types`
- `03fbdc3` `refactor: simplify return request controller flow`
- `7013afe` `refactor: tighten return request repository queries`
- `5387fce` `refactor: harden legacy return routes and controller`
- `f7830d1` `test: cover return request query wrappers`
- `9e9b627` `test: lock app route coexistence`
- `b2e2513` `refactor: share return route role access helpers`
- `77c6978` `test: cover tracking route wiring`
- `4f58247` `test: cover tracking controller behavior`
- `5a198ab` `refactor: reuse shared role access in return request controller`
- `af52a72` `refactor: share return request route role sets`
- `b5de1da` `refactor: streamline return request transitions`
- `77792e3` `test: lock legacy order return read contract`
- `dd922ae` `refactor: add order-based return request lookup`
- `34078c4` `refactor: bridge legacy order return reads to return-order`
- `17d7eb2` `refactor: centralize legacy return read fallback`
- `ba63a4b` `refactor: centralize legacy customer return routes`
- `21a77a3` `refactor: extract legacy return customer handlers`
- `1d32d14` `refactor: extract legacy return admin handlers`
- `1746ac2` `refactor: extract legacy return order handlers`
- `6c793c0` `refactor: isolate legacy return controller wiring`
- `56c4224` `refactor: split legacy return route wiring`
- `52f0c2f` `test: cover role and permission route wiring`
- `7cbbf20` `test: cover role controller contracts`
- `b09e32b` `refactor: split return request route wiring`
- `f9aee1e` `refactor: split return request controller handlers`
- `f7cad00` `refactor: isolate return request controller shim`
- `2104a17` `refactor: widen safe legacy create compatibility`
- `9b2d8d4` `test: lock legacy create compatibility boundaries`
- `d0824ba` `refactor: canonicalize client return statuses`
- `44c430e` `refactor: harden client return wording fallbacks`
- `cd84405` `refactor: harden order action panel dialogs`
- `9323641` `refactor: harden return status normalization`
- `f12aed9` `refactor: normalize return detail status logs`
- `cd88c42` `refactor: canonicalize legacy order return reads`
- `117f910` `refactor: normalize return create responses`
- `9331bab` `refactor: harden recent orders wording fallbacks`
- `595156e` `refactor: harden order timeline fallbacks`
- `4695944` `refactor: harden admin order detail fallbacks`
- `98d7712` `refactor: harden payment badge fallbacks`
- `526e563` `refactor: harden admin orders fallbacks`
- `0ec9b19` `refactor: harden order detail component fallbacks`
- `a7373b1` `refactor: harden shipping address fallback`
- `84666fa` `refactor: harden payment qr fallbacks`
- `dc3d7bf` `refactor: harden checkout payment fallbacks`
