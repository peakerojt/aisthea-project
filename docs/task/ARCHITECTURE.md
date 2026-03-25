# AISTHEA Architecture Guide

## Purpose

This document defines the architecture standard for the current cleanup wave.
The repository is in a hybrid state: some domains already use module-owned
routes/controllers/services, while other areas still rely on legacy
`routes/`, `controllers/`, and `services/` folders.

The goal is not a big-bang rewrite. The goal is to make every new change move
the codebase toward one consistent shape.

## Current Direction

Use the module-owned pattern as the default target for backend work.

Good references in the current codebase:

- `server/src/modules/order/`
- `server/src/modules/return-order/`
- `server/src/modules/products/`
- `server/src/modules/tracking/`

Frontend already has strong separation between route registration, shared
services, shared validation, and page-level UI. The main refactor target is
to reduce page-level orchestration bloat in large files such as Checkout.

Current documentation/source-of-truth locations:

- `README.md`: onboarding and local setup
- `ARCHITECTURE.md`: structural boundaries and refactor rules
- `AUDIT_PROGRESS.md`: live migration, risk, and resume state
- `AISTHEA_IMPLEMENTATION_CHECKLIST_EN.md`: active execution order
- `docs/decisions/`: explicit architectural and migration boundaries
- `docs/audits/`: focused cleanup/audit notes
- `docs/i18n/`: i18n audit/reference material kept out of runtime source trees

## Backend Standard

Preferred domain structure:

```text
server/src/modules/<domain>/
  <domain>.routes.ts
  <domain>.controller.ts
  <domain>.service.ts
  <domain>.repository.ts
  <domain>.validator.ts
  <domain>.types.ts
  __tests__/
```

Use this split:

- `routes`: HTTP paths, auth/role middleware, request validation wiring.
- `controller`: request parsing plus response mapping only.
- `service`: business rules, orchestration, transaction flow.
- `repository`: Prisma/data access only.
- `validator`: Zod schemas and request contracts.
- `types`: domain-specific DTOs, payloads, shared enums, helper interfaces.

Rules:

- Controllers must stay thin. They should not contain pricing, payment,
  status-transition, or refund decision logic.
- Repositories must not know about Express request/response objects.
- Services may call multiple repositories or external providers, but should
  return domain results instead of raw Prisma responses when possible.
- New work should be mounted from `server/src/app.ts` through module-owned
  routes.
- If a legacy controller must be touched, prefer extracting logic into a
  module service instead of adding more logic inline.

## API Response Contract

The default API contract is normalized by
`server/src/middlewares/response.middleware.ts`.

Preferred success shape:

```json
{
  "success": true,
  "messageKey": "common:success.ok",
  "message": "Localized message",
  "data": {}
}
```

Preferred error shape:

```json
{
  "success": false,
  "statusCode": 400,
  "type": "VALIDATION",
  "errorCode": "VALIDATION_ERROR",
  "messageKey": "common:errors.validation",
  "message": "Localized message",
  "details": []
}
```

Rules:

- Controllers should return `messageKey` and `data` when possible.
- Avoid custom response envelopes unless an external contract forces them.
- VNPay IPN and VNPay return are valid exceptions because they must preserve
  gateway-compatible payloads and are bypassed by the response normalizer.

## Return / Refund Boundary

Current source-of-truth rules:

- Client rendering should use canonical status mapping/helpers instead of raw
  legacy aliases.
- The modern create flow is `/api/return-requests` and requires itemized
  `items + attachments`.
- The legacy create flow is `/api/orders/:id/return` and still accepts
  order-level `reason + proofImages`.
- Safe bridge cases are limited to cases where exactly one valid return item
  can be derived without guessing customer intent.
- Ambiguous multi-item legacy create remains intentionally legacy until a
  product/API contract explicitly resolves item selection.

See `docs/decisions/legacy-return-create-boundary.md` for the active boundary.

## Frontend Standard

Preferred frontend split:

```text
client/src/
  app/routes/
  common/
    api/
    services/
    hooks/
    components/
    validation/
    utils/
    pages/
  store/
    pages/
    components/
  admin/
    pages/
    components/
    hooks/
```

Use this split:

- `app/routes`: lazy route registration only.
- `pages`: page orchestration and layout composition.
- `components`: reusable UI pieces with minimal business logic.
- `hooks`: stateful orchestration for forms, async flows, realtime state, and
  side effects.
- `services` / `api`: transport and data-fetching abstractions.
- `validation`: Zod schemas and client-side normalization.
- `utils`: pure helpers with no React or transport coupling.

Rules:

- Large pages should be broken into sections and hooks before adding more
  responsibilities.
- Business rules such as pricing normalization, coupon application state, and
  submit flow should live in hooks or services, not directly inside page JSX.
- Reusable summary/status UI should stay in `common/components`.

## High-Risk No-Refactor Zones

These areas should not receive direct cleanup refactors without scaffolding,
tests, and a very explicit task:

- `server/src/app.ts`
- `server/src/services/return.service.ts`
- `client/src/admin/components/OrderActionPanel.tsx:executeTransition`

Preferred approach:

- document the boundary first
- add tests/contracts first
- extract around the edge instead of rewriting the center

## Current Priorities

### Priority 1

- Keep return/refund cleanup bounded to low-risk client wording and legacy
  assumption surfaces.
- Prefer tests and documentation over direct refactors in high-risk legacy
  zones.

### Priority 2

- Continue standardizing shared domain constants/types for return, refund, and
  adjacent order transitions.
- Keep legacy/modern boundaries explicit rather than hiding them through naming.

### Priority 3

- Expand documentation and verification guardrails so future slices can resume
  without re-auditing structure each time.

## Migration Rules

- Do not start random refactors without mapping the target domain first.
- When editing a function, run GitNexus impact analysis before changing it.
- Update direct dependents identified by GitNexus before closing the task.
- Prefer extract-and-adapt over full rewrites.
- Preserve public API shapes unless the task explicitly includes a contract
  change.

## Immediate Task Breakdown

1. Standardize architecture decisions in this document.
2. Refactor VNPay so controller delegates to service and signature helpers.
3. Split Checkout into hooks:
   - `useCheckoutForm`
   - `useCheckoutPricing`
   - `useCheckoutSubmit`
4. Extract Checkout UI sections:
   - `ContactSection`
   - `ShippingSection`
   - `PaymentSection`
5. Continue return/refund consolidation into the `return-order` module.
6. Add tests around each migrated flow before widening the refactor.
