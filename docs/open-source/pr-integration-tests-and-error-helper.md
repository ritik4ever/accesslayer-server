# feat: integration tests and structured error response helper with request IDs

## Summary

This PR delivers four scoped improvements to test coverage and error response consistency:

### 1. Creator List Newest-Registered Sort Test
**File:** `src/modules/creators/creator-feed-newest-sort.integration.test.ts`

Adds an integration test for the `sort=createdAt&order=desc` path on `GET /api/v1/creators`. Uses three fixtures with distinct `createdAt` timestamps and asserts:
- `fetchCreatorList` receives `sort=createdAt` and `order=desc`
- Response items arrive in strict descending registration order
- Each consecutive pair satisfies `current.createdAt > next.createdAt`
- A deliberate reversed-order fixture case confirms the test fails when ordering is wrong
- Pagination meta reflects the full fixture count

Follows the same fixture factory and `makeReq` / `makeRes` / `makeNext` conventions used by `creator-feed-default-sort.integration.test.ts` and `creator-feed-multi-filter.integration.test.ts`.

---

### 2. Creator Detail Cache Header Integration Test
**File:** `src/modules/creator/creator-detail-cache-headers.integration.test.ts`

Adds an integration test validating `Cache-Control` header behaviour on `GET /api/v1/creators/:creatorId/profile`. Asserts:
- The header is present and equals `CREATOR_PUBLIC_ROUTE_CACHE_CONTROL_HEADER.publicRead`
- The header value matches the documented `public, max-age=<N>` pattern
- `max-age` is a positive integer
- The handler does not override a header set by upstream middleware (regression guard)
- HTTP 200 is returned alongside the cache header for a found profile

The test is wired directly to the constants in `creator-public-cache.constants.ts`, so any drift in the documented policy immediately surfaces as a failure.

---

### 3. Cursor Pagination Round-Trip Integration Test
**File:** `src/modules/creators/creator-feed-cursor-pagination.integration.test.ts`

Implements a happy-path round-trip test using a 6-item fixture set (guaranteeing two full pages at `limit=3`):
1. Fetch page one (`offset=0, limit=3`) — asserts 3 items and `hasMore=true`
2. Encode the last item on page one into a cursor via `encodeCursor`
3. Decode the cursor and verify the payload round-trips cleanly
4. Fetch page two (`offset=3, limit=3`) — asserts correct IDs, `hasMore=false`, and zero overlap with page one
5. Assert that a tampered cursor is rejected by `decodeCursor`

---

### 4. Structured Error Response Helper with Request IDs
**Files:** `src/utils/api-response.utils.ts`, `src/utils/test/api-response.utils.test.ts`

Adds `buildErrorResponse` — a reusable helper that constructs the standard `ApiErrorResponse` body and automatically embeds the `requestId` from the active `AsyncLocalStorage` context:

```ts
export function buildErrorResponse(
  code: ErrorCodeType,
  message: string,
  details?: Array<{ field?: string; message: string }>
): ApiErrorResponse
```

- `requestId` is included when an ALS context with a request ID is active
- `requestId` is **omitted entirely** (not set to `null`) when no context is present
- `sendError` is updated to delegate to `buildErrorResponse`, so every error path in the API automatically carries the request ID without any call-site changes
- Because the logger reads from the same ALS context, the `requestId` in the response body matches the corresponding server log entry, enabling direct correlation

New tests cover: no-context omission, ALS context inclusion, empty-context omission, details inclusion/omission, and the log-correlation invariant.

---

## Changed Files

| File | Change |
|------|--------|
| `src/modules/creators/creator-feed-newest-sort.integration.test.ts` | New — newest-registered sort test |
| `src/modules/creator/creator-detail-cache-headers.integration.test.ts` | New — cache header regression test |
| `src/modules/creators/creator-feed-cursor-pagination.integration.test.ts` | New — cursor pagination round-trip test |
| `src/utils/api-response.utils.ts` | Modified — add `buildErrorResponse`, apply to `sendError`, import ALS |
| `src/utils/test/api-response.utils.test.ts` | Modified — add `buildErrorResponse` test suite |

**557 insertions, 9 deletions across 5 files.**

---

## Testing

- [ ] `pnpm lint`
- [ ] `pnpm build`
- [ ] `pnpm exec prisma generate` when schema or generated types changed

Run new tests in isolation:

```bash
pnpm exec jest --testPathPattern="creator-feed-newest-sort|creator-detail-cache-headers|creator-feed-cursor-pagination|api-response.utils.test" --no-coverage
```

---

## Checklist

- [x] Linked issue or backlog item
- [x] No secrets or live credentials added
- [x] Docs updated if setup or env changed
- [x] Change is scoped to one problem
- [x] All new tests follow existing fixture and assertion conventions
- [x] No existing tests removed or modified beyond the targeted extension
- [x] `buildErrorResponse` is backward-compatible — `sendError` call sites are unchanged
