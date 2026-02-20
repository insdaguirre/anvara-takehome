import { describe, it } from 'vitest';

// BONUS: Implement unit tests for API endpoints
// You'll need to install supertest: pnpm add -D supertest @types/supertest

describe('Sponsorships API', () => {
  // BONUS: Implement these tests

  describe('GET /api/sponsorships', () => {
    it.todo('returns an array of sponsorships');
    // Example:
    // it('returns an array of sponsorships', async () => {
    //   const response = await request(app).get('/api/sponsorships');
    //   expect(response.status).toBe(200);
    //   expect(Array.isArray(response.body)).toBe(true);
    // });

    it.todo('sponsorships have required fields');
  });

  describe('GET /api/sponsorships/:id', () => {
    it.todo('returns a single sponsorship by ID');

    it.todo('returns 404 for non-existent sponsorship');
  });

  describe('POST /api/sponsorships', () => {
    it.todo('creates a new sponsorship');

    it.todo('returns 400 for missing required fields');
  });

  describe('PUT /api/sponsorships/:id', () => {
    it.todo('updates an existing sponsorship');

    it.todo('returns 404 for non-existent sponsorship');
  });

  describe('GET /api/health', () => {
    it.todo('returns health status');
    // Example:
    // it('returns health status', async () => {
    //   const response = await request(app).get('/api/health');
    //   expect(response.status).toBe(200);
    //   expect(response.body.status).toBe('ok');
    // });
  });
});
