// Integration test: creator profile route — malformed wallet address param
//
// Verifies that the creator route param validation middleware rejects
// malformed wallet addresses (used as creatorId) with HTTP 400 and the
// expected error shape, while valid addresses pass through to the handler.
//
// Tests the full handler flow with a mocked service layer — no database required.

import { getCreatorProfileHandler } from './creator-profile.handlers';
import * as creatorProfileService from './creator-profile.service';

// ── Lightweight request/response mocks ────────────────────────────────────────

function makeReq(params: Record<string, string> = {}): any {
   return { params };
}

function makeRes(): any {
   const res: any = {};
   res.status = jest.fn().mockReturnValue(res);
   res.json = jest.fn().mockReturnValue(res);
   res.setHeader = jest.fn().mockReturnValue(res);
   res.set = jest.fn().mockReturnValue(res);
   return res;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/v1/creators/:creatorId/profile — malformed wallet address param', () => {
   afterEach(() => {
      jest.restoreAllMocks();
   });

   // ── Malformed variants ────────────────────────────────────────────────────

   it('returns 400 for an empty creatorId', async () => {
      const req = makeReq({ creatorId: '' });
      const res = makeRes();
      await getCreatorProfileHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(false);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code', 'VALIDATION_ERROR');
   });

   it('returns 400 for a whitespace-only creatorId', async () => {
      const req = makeReq({ creatorId: '   ' });
      const res = makeRes();
      await getCreatorProfileHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(false);
      expect(body.error).toHaveProperty('code', 'VALIDATION_ERROR');
   });

   it('returns 400 for a creatorId exceeding 128 characters', async () => {
      const req = makeReq({ creatorId: 'a'.repeat(129) });
      const res = makeRes();
      await getCreatorProfileHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(false);
      expect(body.error).toHaveProperty('code', 'VALIDATION_ERROR');
   });

   // ── Error shape ───────────────────────────────────────────────────────────

   it('error body contains details with field and message for validation failures', async () => {
      const req = makeReq({ creatorId: '' });
      const res = makeRes();
      await getCreatorProfileHandler(req, res);

      const body = res.json.mock.calls[0][0];
      expect(body.error).toHaveProperty('details');
      expect(Array.isArray(body.error.details)).toBe(true);
      expect(body.error.details.length).toBeGreaterThan(0);
      expect(body.error.details[0]).toHaveProperty('field');
      expect(body.error.details[0]).toHaveProperty('message');
   });

   // ── Valid param unaffected ────────────────────────────────────────────────

   it('returns 200 for a valid creatorId with mocked service', async () => {
      const mockProfile = {
         creatorId: 'GBR3S76M3U2DS4H3XG3YQF3U7MX7C3Y6K3W4MX7P3B3Q3W4K3W4M',
         displayName: null,
         bio: null,
         avatarUrl: null,
         perks: [],
         links: [],
         metadata: { source: 'placeholder' as const, isProfileComplete: false },
      };
      jest
         .spyOn(creatorProfileService, 'getCreatorProfile')
         .mockResolvedValue(mockProfile);

      const req = makeReq({
         creatorId: 'GBR3S76M3U2DS4H3XG3YQF3U7MX7C3Y6K3W4MX7P3B3Q3W4K3W4M',
      });
      const res = makeRes();
      await getCreatorProfileHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.data.creatorId).toBe(
         'GBR3S76M3U2DS4H3XG3YQF3U7MX7C3Y6K3W4MX7P3B3Q3W4K3W4M'
      );
   });

   it('does not call the service layer when params are invalid', async () => {
      const spy = jest.spyOn(creatorProfileService, 'getCreatorProfile');

      const req = makeReq({ creatorId: '' });
      const res = makeRes();
      await getCreatorProfileHandler(req, res);

      expect(spy).not.toHaveBeenCalled();
   });
});
