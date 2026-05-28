// Integration test: creator list response shape consistency across page sizes
//
// Verifies that the response envelope shape is identical for page sizes of
// one, ten, and the maximum allowed. The items array length and pagination
// metadata are the only values that differ between responses; the top-level
// structure (success, data, items, meta, and meta sub-keys) remains stable.
//
// Uses Jest mocks with a fixture large enough to produce varied result counts
// for each page size — no database required.

import { httpListCreators } from './creators.controllers';
import * as creatorsUtils from './creators.utils';
import { MAX_PAGE_SIZE } from '../../constants/pagination.constants';
import type { CreatorProfile } from '../../types/profile.types';

// ── Lightweight request/response mocks ────────────────────────────────────────

function makeReq(query: Record<string, string> = {}): any {
   return { query };
}

function makeRes(): any {
   const res: any = {};
   res.status = jest.fn().mockReturnValue(res);
   res.json = jest.fn().mockReturnValue(res);
   res.setHeader = jest.fn().mockReturnValue(res);
   res.set = jest.fn().mockReturnValue(res);
   return res;
}

function makeNext(): jest.Mock {
   return jest.fn();
}

// ── Minimal fixture factory ───────────────────────────────────────────────────

function makeFixtures(count: number): CreatorProfile[] {
   return Array.from({ length: count }, (_, i) => ({
      id: `cuid-${i + 1}`,
      userId: `user-${i + 1}`,
      handle: `creator_${i + 1}`,
      displayName: `Creator ${i + 1}`,
      isVerified: i % 2 === 0,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
   }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/v1/creators — response shape consistency across page sizes', () => {
   const TOTAL_CREATORS = MAX_PAGE_SIZE;
   const fixtures = makeFixtures(TOTAL_CREATORS);

   afterEach(() => {
      jest.restoreAllMocks();
   });

   // Shared mock that returns the correct slice based on the query limit/offset
   function mockFetchSlice(): void {
      jest.spyOn(creatorsUtils, 'fetchCreatorList').mockImplementation(
         async (query) => {
            const items = fixtures.slice(
               query.offset,
               query.offset + query.limit
            );
            return [items, TOTAL_CREATORS];
         }
      );
   }

   const pageSizes = [1, 10, MAX_PAGE_SIZE];

   it('returns identical top-level envelope keys for all page sizes', async () => {
      mockFetchSlice();

      const bodies = await Promise.all(
         pageSizes.map(async (size) => {
            const req = makeReq({ limit: String(size) });
            const res = makeRes();
            await httpListCreators(req, res, makeNext());
            return res.json.mock.calls[0][0];
         })
      );

      const expectedKeys = ['success', 'data'];
      for (const body of bodies) {
         expect(Object.keys(body).sort()).toEqual(expectedKeys.sort());
         expect(body.success).toBe(true);
      }
   });

   it('returns identical data envelope keys for all page sizes', async () => {
      mockFetchSlice();

      const bodies = await Promise.all(
         pageSizes.map(async (size) => {
            const req = makeReq({ limit: String(size) });
            const res = makeRes();
            await httpListCreators(req, res, makeNext());
            return res.json.mock.calls[0][0];
         })
      );

      const expectedDataKeys = ['items', 'meta'];
      for (const body of bodies) {
         expect(Object.keys(body.data).sort()).toEqual(
            expectedDataKeys.sort()
         );
         expect(Array.isArray(body.data.items)).toBe(true);
         expect(body.data.meta).toBeTruthy();
      }
   });

   it('returns identical meta keys for all page sizes', async () => {
      mockFetchSlice();

      const bodies = await Promise.all(
         pageSizes.map(async (size) => {
            const req = makeReq({ limit: String(size) });
            const res = makeRes();
            await httpListCreators(req, res, makeNext());
            return res.json.mock.calls[0][0];
         })
      );

      const expectedMetaKeys = ['limit', 'offset', 'total', 'hasMore'];
      for (const body of bodies) {
         expect(Object.keys(body.data.meta).sort()).toEqual(
            expectedMetaKeys.sort()
         );
      }
   });

   it('items array length matches the requested page size', async () => {
      mockFetchSlice();

      const bodies = await Promise.all(
         pageSizes.map(async (size) => {
            const req = makeReq({ limit: String(size) });
            const res = makeRes();
            await httpListCreators(req, res, makeNext());
            return res.json.mock.calls[0][0];
         })
      );

      expect(bodies[0].data.items).toHaveLength(1);
      expect(bodies[1].data.items).toHaveLength(10);
      expect(bodies[2].data.items).toHaveLength(MAX_PAGE_SIZE);
   });

   it('meta.limit matches the requested page size for each request', async () => {
      mockFetchSlice();

      const bodies = await Promise.all(
         pageSizes.map(async (size) => {
            const req = makeReq({ limit: String(size) });
            const res = makeRes();
            await httpListCreators(req, res, makeNext());
            return res.json.mock.calls[0][0];
         })
      );

      expect(bodies[0].data.meta.limit).toBe(1);
      expect(bodies[1].data.meta.limit).toBe(10);
      expect(bodies[2].data.meta.limit).toBe(MAX_PAGE_SIZE);
   });

   it('meta.total is the same across all page sizes', async () => {
      mockFetchSlice();

      const bodies = await Promise.all(
         pageSizes.map(async (size) => {
            const req = makeReq({ limit: String(size) });
            const res = makeRes();
            await httpListCreators(req, res, makeNext());
            return res.json.mock.calls[0][0];
         })
      );

      for (const body of bodies) {
         expect(body.data.meta.total).toBe(TOTAL_CREATORS);
      }
   });

   it('meta.offset is 0 for all requests (default)', async () => {
      mockFetchSlice();

      const bodies = await Promise.all(
         pageSizes.map(async (size) => {
            const req = makeReq({ limit: String(size) });
            const res = makeRes();
            await httpListCreators(req, res, makeNext());
            return res.json.mock.calls[0][0];
         })
      );

      for (const body of bodies) {
         expect(body.data.meta.offset).toBe(0);
      }
   });

   it('meta.hasMore reflects whether more items exist beyond the current page', async () => {
      mockFetchSlice();

      const bodies = await Promise.all(
         pageSizes.map(async (size) => {
            const req = makeReq({ limit: String(size) });
            const res = makeRes();
            await httpListCreators(req, res, makeNext());
            return res.json.mock.calls[0][0];
         })
      );

      // page size 1 < TOTAL_CREATORS → hasMore true
      expect(bodies[0].data.meta.hasMore).toBe(true);
      // page size 10 < TOTAL_CREATORS → hasMore true
      expect(bodies[1].data.meta.hasMore).toBe(true);
      // page size MAX_PAGE_SIZE == TOTAL_CREATORS → hasMore false
      expect(bodies[2].data.meta.hasMore).toBe(false);
   });
});
