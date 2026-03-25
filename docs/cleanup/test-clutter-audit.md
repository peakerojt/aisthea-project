# Test Clutter Audit

Last reviewed: 2026-03-25

This note records the focused Phase E pass requested by
`AISTHEA_FULL_PROJECT_CLEANUP_GUIDE_EN.md`.

## Scope Reviewed

- client test suites under:
  - `client/src/admin/**/__tests__/`
  - `client/src/common/**/__tests__/`
  - `client/src/store/**/__tests__/`
  - `client/src/app/__tests__/`
- server test suites under:
  - `server/src/**/__tests__/`
  - `server/src/**/*.test.ts`

## Findings

### Test placement

Test placement remains consistent after the previous cleanup passes:

- client tests now live under `__tests__/`
- server tests also resolve through `__tests__/` or the root app-level test folder
- no new colocated runtime + test siblings outside the agreed convention were found

### Vague or low-value test naming

The latest narrow scan did not expose another broad cluster of placeholder test
names such as `works`, `test`, or `component/page`-only suite titles.

The one clearly vague test wording that had surfaced in the prior pass was:

- `client/src/common/components/__tests__/OrderTimeline.test.tsx`

That suite has already been normalized to behavior-focused titles.

### Duplicated assertion clusters

No obvious duplicated smoke-test cluster stood out strongly enough in this pass
to justify another rename-only test commit yet. Most currently tracked tests are
already phrased around specific contracts:

- fallback wording
- route ownership
- error-envelope preservation
- coexistence boundaries
- status normalization

## Safe Interpretation For Phase E

What is already true:

- the project no longer has broad test-placement clutter
- the highest-value touched suites are behavior-focused
- the first obvious vague naming cleanup has already been applied

What still keeps Phase E open:

- there are still many broad regression suites, so duplicated assertions may
  exist even if they are not obvious from filename/title scans alone
- some older tests may still describe UI smoke behavior rather than the exact
  contract they protect

## Recommended Next Safe Steps

1. Continue reviewing test names opportunistically when a suite is already being
   touched for another cleanup slice.
2. Prefer targeted assertion cleanup over wide churn across stable test files.
3. Only open another test-only cleanup commit when a clear cluster of vague or
   duplicated tests is found, not just isolated wording preferences.

## Closure Note

The latest whole-project placeholder-title scan did not surface any new broad
cluster of `render`, `works`, `empty`, or `test`-style suite titles. Combined
with the now-standardized test placement, this is enough to treat Phase E as
closed for the cleanup guide. Future test cleanup can stay opportunistic.

During the later Phase I verification pass, four smaller test-only hygiene
issues did surface:

- missing `cleanup()` isolation in
  `client/src/admin/components/__tests__/OrderActionPanel.test.tsx`
- missing `cleanup()` isolation in
  `client/src/admin/components/__tests__/RecentOrders.test.tsx`
- missing `cleanup()` isolation in
  `client/src/common/components/__tests__/OrderTimeline.test.tsx`
- one ambiguous duplicate-text assertion in
  `client/src/store/pages/__tests__/ReturnDetail.test.tsx`

These were fixed as part of the final verification pass and do not reopen
Phase E as broad project-wide clutter.
