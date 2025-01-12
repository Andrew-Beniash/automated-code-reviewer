import request from 'supertest';
import { app } from '@server/app';  // You'll need to create this file
import { createTestUser, cleanupTestUser } from '../test-utils';

describe('User Authentication Flow', () => {
  beforeAll(async () => {
    await createTestUser();
  });

  afterAll(async () => {
    await cleanupTestUser();
  });

  test('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testPass123!'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });
});