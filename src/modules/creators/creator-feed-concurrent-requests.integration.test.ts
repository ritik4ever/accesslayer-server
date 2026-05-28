// Integration test: concurrent creator list requests
//
// Verifies that concurrent requests to the creator list endpoint return
// consistent results when no writes occur between them. Multiple requests
// fired simultaneously should produce identical item sets and pagination
// metadata, confirming there are no race conditions in the read path.
//
// Uses Jest mocks with a static fixture — no database required.

import { httpListCreators } from './creators.controllers';
import * as creatorsUtils from './creators.utils';
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

describe('GET /api/v1/creators — concurrent requests return consistent results', () => {
   afterEach(() => {
      jest.restoreAllMocks();
   });

   it('returns identical item sets for two concurrent requests', async () => {
      const fixtures = makeFixtures(5);
      jest
         .spyOn(creatorsUtils, 'fetchCreatorList')
         .mockResolvedValue([fixtures, 5]);

      const reqs = [makeReq(), makeReq()];
      const reses = [makeRes(), makeRes()];
      const nexts = [makeNext(), makeNext()];

      await Promise.all(
         reqs.map((req, i) => httpListCreators(req, reses[i], nexts[i]))
      );

      const bodies = reses.map((res) => res.json.mock.calls[0][0]);
      expect(bodies[0]).toEqual(bodies[1]);
   });

   it('returns identical item sets for three concurrent requests', async () => {
      const fixtures = makeFixtures(5);
      jest
         .spyOn(creatorsUtils, 'fetchCreatorList')
         .mockResolvedValue([fixtures, 5]);

      const reqs = [makeReq(), makeReq(), makeReq()];
      const reses = [makeRes(), makeRes(), makeRes()];
      const nexts = [makeNext(), makeNext(), makeNext()];

      await Promise.all(
         reqs.map((req, i) => httpListCreators(req, reses[i], nexts[i]))
      );

      const bodies = reses.map((res) => res.json.mock.calls[0][0]);
      for (let i = 1; i < bodies.length; i++) {
         expect(bodies[i]).toEqual(bodies[0]);
      }
   });

   it('returns identical pagination metadata across concurrent requests', async () => {
      const fixtures = makeFixtures(50);
      jest
         .spyOn(creatorsUtils, 'fetchCreatorList')
         .mockResolvedValue([fixtures, 50]);

      const req = makeReq({ limit: '10', offset: '5' });
      const reses = [makeRes(), makeRes(), makeRes()];
      const nexts = [makeNext(), makeNext(), makeNext()];

      await Promise.all(
         reses.map((_res, i) => httpListCreators(req, reses[i], nexts[i]))
      );

      const bodies = reses.map((res) => res.json.mock.calls[0][0]);
      for (let i = 1; i < bodies.length; i++) {
         expect(bodies[i].data.meta).toEqual(bodies[0].data.meta);
      }
   });

   it('returns consistent hasMore and total across concurrent requests', async () => {
      const fixtures = makeFixtures(3);
      jest
         .spyOn(creatorsUtils, 'fetchCreatorList')
         .mockResolvedValue([fixtures, 3]);

      const reqs = [makeReq(), makeReq(), makeReq()];
      const reses = [makeRes(), makeRes(), makeRes()];
      const nexts = [makeNext(), makeNext(), makeNext()];

      await Promise.all(
         reqs.map((req, i) => httpListCreators(req, reses[i], nexts[i]))
      );

      const bodies = reses.map((res) => res.json.mock.calls[0][0]);
      for (let i = 1; i < bodies.length; i++) {
         expect(bodies[i].data.items).toHaveLength(
            bodies[0].data.items.length
         );
         expect(bodies[i].data.meta.total).toBe(bodies[0].data.meta.total);
         expect(bodies[i].data.meta.hasMore).toBe(bodies[0].data.meta.hasMore);
      }
   });

   it('each concurrent request receives a distinct response object', async () => {
      const fixtures = makeFixtures(5);
      jest
         .spyOn(creatorsUtils, 'fetchCreatorList')
         .mockResolvedValue([fixtures, 5]);

      const reqs = [makeReq(), makeReq()];
      const reses = [makeRes(), makeRes()];
      const nexts = [makeNext(), makeNext()];

      await Promise.all(
         reqs.map((req, i) => httpListCreators(req, reses[i], nexts[i]))
      );

      // Each response should be a distinct object, not shared references
      const bodies = reses.map((res) => res.json.mock.calls[0][0]);
      expect(bodies[0]).not.toBe(bodies[1]);
   });
});
