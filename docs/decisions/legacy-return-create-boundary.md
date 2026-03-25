# Legacy Return Create Boundary

Date: 2026-03-24

Status: DECIDED

## Decision

The current migration phase keeps an explicit boundary for legacy create requests:

- The legacy route `/api/orders/:id/return` may use the modern `return-order` flow only when the item selection is unambiguous.
- Ambiguous multi-item legacy create requests stay on the legacy return service for now.
- A future migration phase may revisit this only after the legacy contract can provide explicit item selection.

This boundary is intentional. It is not an abandoned bug.

## Why the boundary exists

The legacy create contract is order-level:

- payload fields: `reason + proofImages`
- route/controller entry: `server/src/controllers/return.order-handlers.ts`

The modern `return-order` create contract is itemized:

- payload fields: `items + attachments`
- service entry: `server/src/modules/return-order/services/return-request.service.ts#createReturnRequest`

Because the legacy payload does not tell us which order item(s) the customer wants to return, it cannot always be translated safely into the modern request shape.

## What is safe today

The compatibility bridge is safe only when the system can derive exactly one returnable item selection:

- single-line orders with one returnable item
- multi-line orders where only one remaining returnable item is still eligible

That behavior is implemented by:

- `server/src/modules/return-order/services/return-request.service.ts#createLegacyCompatibleReturnRequest`
- `server/src/shared/legacy-return-create.adapter.ts#buildLegacyCreateReturnDraft`
- `server/src/shared/legacy-return-write.adapter.ts#createReturnWithModernFallback`

`buildLegacyCreateReturnDraft` returns `null` unless the derived draft contains exactly one valid return item.

## What is intentionally not bridged

Ambiguous multi-item legacy create requests are not migrated into `return-order` when:

- more than one returnable item remains
- the legacy payload does not specify item selection
- mapping `reason + proofImages` to multiple `items` would require guessing customer intent

In that case, the request remains on the legacy service path instead of forcing a lossy translation.

## Consequences

- Read-path migration can stay complete and stable.
- Safe write-path migration can stay enabled for unambiguous create cases.
- Ambiguous multi-item create remains a product/API contract problem, not a controller bug.
- Any future migration must start by changing the request contract, not by widening controller guesses.

## Follow-up policy

For the current phase, we keep the boundary.

If the team opens a later migration phase, it should only proceed after one of the following becomes true:

- the legacy route adds explicit item selection
- the client is fully moved to the modern create route
- product/API agree on a deterministic multi-item mapping contract
