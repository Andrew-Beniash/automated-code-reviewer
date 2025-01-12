import request from 'supertest';
import { app } from '@server/app';
import { setupTestDatabase, cleanupTestDatabase } from '../test-utils';

describe('Code Review Flow', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  test('should complete full code review process', async () => {
    // Step 1: Create a new code review request
    const reviewResponse = await request(app)
      .post('/api/reviews')
      .send({
        repositoryUrl: 'https://github.com/test/repo',
        branch: 'main',
        commitHash: '123abc'
      });

    expect(reviewResponse.status).toBe(201);
    const reviewId = reviewResponse.body.id;

    // Step 2: Check review status
    const statusResponse = await request(app)
      .get(`/api/reviews/${reviewId}/status`);

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.status).toBe('pending');
  });
});