# AISTHEA — Implementation Checklist

This document is a detailed execution checklist derived from the multi-phase roadmap.  
Its purpose is to let the team **pick up tasks directly**, in a clear priority order, without drifting into unfocused refactoring.

This file is an active working checklist and should stay synchronized with `AUDIT_PROGRESS.md` whenever the project state, stop point, or resume point changes.

---

# How to use this document

- Each task includes:
  - **Objective**
  - **Work items**
  - **Definition of done**
  - **Priority**
- Priority labels:
  - **P0**: do immediately
  - **P1**: do after P0 is stable
  - **P2**: long-term quality and optimization
- Do not merge half-finished work. Every task should include:
  - code
  - matching tests if behavior is affected
  - documentation updates if the task changes boundaries or contracts

---

# Current handoff snapshot

Date: 2026-03-25

## Done

- `1.1` Write a decision doc for legacy multi-item create
- `1.2` Finalize the strategy for ambiguous multi-item create
- `1.3` Synchronize `AUDIT_PROGRESS.md`
- `2.2` Align status rendering with canonical mapping
- `3.1` Increase tests for `parseProofImages`
- `3.2` Increase pagination/filter tests for legacy return read path
- Cleanup-only work from `AISTHEA_FULL_PROJECT_CLEANUP_GUIDE_EN.md`

## In progress

- `2.1` Audit all return/refund wording in the client
- `2.3` Remove legacy assumptions from UI flows
- `2.4` Add UI tests for status/action rendering
- `3.4` Review the current bridge/fallback paths

## Pending

- `3.3` Do not refactor `server/src/app.ts`; add contract tests only if needed

## Resume point after cleanup

- Cleanup-only work from `AISTHEA_FULL_PROJECT_CLEANUP_GUIDE_EN.md` is complete
- Resume from the next bounded low-risk client wording/legacy-assumption surface, not from high-risk transition logic
- Continue to avoid direct refactors in:
  - `client/src/admin/components/OrderActionPanel.tsx:executeTransition`
  - `server/src/services/return.service.ts`
  - `server/src/app.ts`

---

# Phase 1 — Finalize the migration boundary

## Task 1.1 — Write a decision doc for legacy multi-item create
**Priority:** P0
**Status:** Done

### Objective
Clearly document why the legacy create flow cannot yet be fully migrated to the modern flow.

### Work items
- Create:
  - `docs/decisions/legacy-return-create-boundary.md`
- Explain clearly:
  - the legacy flow currently accepts `reason + proofImages`
  - the modern flow requires `items + attachments`
  - safe single-item cases can be bridged
  - ambiguous multi-item cases cannot be bridged safely
- State explicitly:
  - the current boundary is intentional
  - this is not an abandoned unresolved bug

### Definition of done
- A decision doc exists in the repo
- The team can understand why migration cannot continue yet
- The decision doc is linked from `AUDIT_PROGRESS.md`

---

## Task 1.2 — Finalize the strategy for ambiguous multi-item create
**Priority:** P0
**Status:** Done

### Objective
Avoid leaving the team in a “we will decide later” state.

### Work items
- Choose one of these directions:
  - keep the current boundary
  - open a new migration phase later
- Record the decision in the decision doc
- If the decision is not fully finalized yet, record:
  - who owns the decision
  - what additional input is needed
  - the target date for final decision

### Definition of done
- There is a clear status:
  - `DECIDED`
  - or `PENDING_DECISION` with owner + deadline

---

## Task 1.3 — Synchronize `AUDIT_PROGRESS.md`
**Priority:** P0
**Status:** Done

### Objective
Turn the progress file into a real source of truth.

### Work items
- Add sections for:
  - current migration boundary
  - open decisions
  - blocked by product/API
- Ensure this file is updated in the same commit whenever checklist status changes

### Definition of done
- `AUDIT_PROGRESS.md` reflects the latest known boundary
- No vague tasks remain without owner or status

---

# Phase 2 — Clean up client return/refund consistency

## Task 2.1 — Audit all return/refund wording in the client
**Priority:** P0
**Status:** In Progress

### Objective
Find all UI text that still uses legacy vocabulary.

### Work items
- Review:
  - page titles
  - section titles
  - status labels
  - button labels
  - empty states
  - toasts
  - modal copy
  - success/error messages
- Build a mismatch list:
  - current text
  - correct canonical text
  - file where the text appears

### Definition of done
- A complete mismatch list exists
- A cleanup PR can be created directly from that list

---

## Task 2.2 — Align status rendering with canonical mapping
**Priority:** P0
**Status:** Done

### Objective
The UI must display status via shared canonical mapping, not raw legacy aliases.

### Work items
- Find all places that render raw status values
- Switch them to shared mapping/helpers
- Verify both customer and admin flows

### Definition of done
- No direct rendering of legacy status values remains
- The same status renders the same label across all screens

---

## Task 2.3 — Remove legacy assumptions from UI flows
**Priority:** P0
**Status:** In Progress

### Objective
Prevent the UI from accidentally forcing users through an outdated flow.

### Work items
- Review rendering and behavior based on:
  - item count
  - return type
  - available actions
- Remove assumptions such as:
  - there is only one create-return flow
  - every case is order-level
  - every legacy status is already canonical

### Definition of done
- Return/refund screens no longer rely implicitly on legacy contracts

---

## Task 2.4 — Add UI tests for status/action rendering
**Priority:** P0
**Status:** In Progress

### Objective
Lock UI behavior after cleanup.

### Work items
- Add tests for:
  - status label rendering
  - action button visibility
  - customer/admin differences
  - important empty/error states

### Definition of done
- Tests pass
- Reviewers can rely on tests to validate behavior

---

# Phase 3 — Harden high-risk legacy zones

## Task 3.1 — Increase tests for `parseProofImages`
**Priority:** P0
**Status:** Done

### Objective
Lock down the parsing behavior in a sensitive legacy return flow area.

### Work items
- Add tests for:
  - valid JSON
  - invalid JSON
  - null/undefined
  - empty arrays
  - malformed data
- Verify current fallback behavior explicitly

### Definition of done
- Important parsing branches are covered
- Parsing behavior no longer has to be inferred manually

---

## Task 3.2 — Increase pagination/filter tests for legacy return read path
**Priority:** P0
**Status:** Done

### Objective
Keep the migrated read path stable.

### Work items
- Test:
  - first page
  - last page
  - empty result
  - status filtering
  - edge inputs / invalid inputs
- Lock the normalized read shape

### Definition of done
- The legacy read path does not regress when surrounding code is cleaned up

---

## Task 3.3 — Do not refactor `server/src/app.ts`; add contract tests only if needed
**Priority:** P0
**Status:** Pending

### Objective
Reduce full-app risk.

### Work items
- Do not perform large cleanup in `app.ts`
- Add tests only if:
  - a new route is introduced
  - coexistence behavior changes
  - boot wiring changes affect runtime

### Definition of done
- `app.ts` is not changed unnecessarily
- Protective tests exist if route wiring changes

---

## Task 3.4 — Review the current bridge/fallback paths
**Priority:** P0
**Status:** In Progress

### Objective
Ensure the existing bridge logic is intentional and backed by tests.

### Work items
- List:
  - safe single-item bridge path
  - fallback path
  - legacy-only path
- Attach tests or notes to each path

### Definition of done
- No hidden bridge/fallback behavior remains unknown to the team

---

# Phase 4 — Standardize domain contracts

## Task 4.1 — Review shared status/constants usage
**Priority:** P1

### Objective
Make sure client and server speak the same domain language.

### Work items
- Review:
  - return status
  - refund status
  - related order transitions
- Identify:
  - aliases with the same meaning
  - inconsistent casing
  - statuses that are no longer used

### Definition of done
- A clear source-of-truth list exists for each status group

---

## Task 4.2 — Clean up constants/types
**Priority:** P1

### Objective
Bring the full flow onto a clear domain vocabulary.

### Work items
- Create or finalize:
  - shared constants
  - shared types
  - mapping helpers
- Replace scattered imports with source-of-truth imports

### Definition of done
- New code does not introduce additional status aliases
- Core modules rely on the same constants/types set

---

## Task 4.3 — Update `ARCHITECTURE.md`
**Priority:** P1

### Objective
Document the updated source of truth.

### Work items
- Add sections for:
  - canonical status mapping
  - legacy boundary
  - response contract
  - rule against direct refactoring of high-risk zones without scaffolding

### Definition of done
- A new developer can understand the current boundary from documentation alone

---

# Phase 5 — Prepare for, or reject, a new migration phase

## Task 5.1 — Prepare decision questions for product/API owners
**Priority:** P1

### Objective
Turn the technical blocker into an explicit decision.

### Work items
- Write down questions such as:
  - is item-level create mandatory?
  - must backward compatibility be preserved?
  - is rejecting ambiguous multi-item creates acceptable?
  - are older clients still active?

### Definition of done
- There is a clear question set ready for product / lead / owner review

---

## Task 5.2 — If opening a new migration phase, write an RFC
**Priority:** P1

### Objective
Do not start a new migration based on intuition alone.

### Work items
- Draft an RFC covering:
  - new contract
  - new client flow
  - fallback plan
  - rollout plan
  - test strategy
  - rollback strategy

### Definition of done
- No implementation starts before the RFC is approved

---

## Task 5.3 — If not opening a new phase, close the boundary officially
**Priority:** P1

### Objective
End ambiguity.

### Work items
- Record in the decision doc:
  - this boundary is final
  - legacy ambiguous multi-item create remains separate
- Update the roadmap and progress file

### Definition of done
- The team no longer assumes a full migration is “coming soon”

---

# Phase 6 — Long-term quality guardrails

## Task 6.1 — Write a review checklist for PRs touching return/payment/auth
**Priority:** P2

### Objective
Prevent new code from polluting the architecture again.

### Work items
- Create a review checklist:
  - does this introduce new legacy assumptions?
  - does it move logic back into a large controller/page?
  - does it bypass shared mapping/helpers?
  - does it include tests to lock new behavior?

### Definition of done
- Reviewers have a usable checklist for PR review

---

## Task 6.2 — Write a regression smoke checklist
**Priority:** P2

### Objective
Have a quick verification list after larger changes.

### Work items
- Create smoke checks for:
  - checkout
  - auth refresh/session
  - payment/VNPay
  - return/refund customer flow
  - return/refund admin flow
  - legacy fallback path

### Definition of done
- QA/dev can use the checklist after merges

---

## Task 6.3 — Maintain progress update discipline
**Priority:** P2

### Objective
Keep the current refactor momentum healthy.

### Work items
- For every refactor slice:
  - update `AUDIT_PROGRESS.md`
  - clearly mark done / in progress / blocked
- Do not allow code to move ahead while documentation stays stale

### Definition of done
- Progress tracking and code state stay aligned

---

# Quick pick-up task list

## Immediate P0 tasks
- [x] Task 1.1 — Write decision doc for legacy multi-item create
- [x] Task 1.2 — Finalize boundary strategy
- [x] Task 1.3 — Update `AUDIT_PROGRESS.md`
- [ ] Task 2.1 — Audit client return/refund wording
- [x] Task 2.2 — Align status rendering
- [ ] Task 2.3 — Remove legacy UI assumptions
- [ ] Task 2.4 — Add UI tests for status/action rendering
- [x] Task 3.1 — Increase `parseProofImages` tests
- [x] Task 3.2 — Increase pagination/filter tests for legacy read path
- [ ] Task 3.3 — Keep `app.ts` stable; add contract tests only if needed
- [ ] Task 3.4 — Review current bridge/fallback paths

## P1 tasks
- [ ] Task 4.1 — Review shared status/constants
- [ ] Task 4.2 — Clean up constants/types
- [ ] Task 4.3 — Update `ARCHITECTURE.md`
- [ ] Task 5.1 — Prepare decision questions for product/API
- [ ] Task 5.2 — If needed, write a new migration RFC
- [ ] Task 5.3 — If no new migration phase, close the boundary officially

## P2 tasks
- [ ] Task 6.1 — Write review checklist
- [ ] Task 6.2 — Write regression smoke checklist
- [ ] Task 6.3 — Keep progress tracking updated per commit

---

# Closing note

From this point onward, the right direction is not:
- more refactoring just to make code “look cleaner”

The right direction is:
- finalize the boundary
- clean up consistency
- harden high-risk zones
- only open a new migration phase when the contract decision is explicit

This document should be used as the practical implementation checklist for the next steps.
