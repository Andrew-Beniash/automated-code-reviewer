import { Request, Response } from 'express';

/**
 * Mocks an Express Request object.
 * @param {Partial<Request>} data - Optional custom data to include in the mock request.
 * @returns {Request} - Mocked Express Request object.
 */
export const mockRequest = (data: Partial<Request> = {}): Request => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ...data,
  } as Request;
};

/**
 * Mocks an Express Response object.
 * @returns {Response} - Mocked Express Response object.
 */
export const mockResponse = (): Response => {
  const res = {} as Response;

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);

  return res;
};

/**
 * Mock a middleware function.
 * @param {(req: Request, res: Response, next: Function) => void} fn - Middleware function to wrap.
 * @returns {jest.MockedFunction} - A Jest mock function for the middleware.
 */
export const mockMiddleware = (
  fn: (req: Request, res: Response, next: Function) => void
): jest.MockedFunction<typeof fn> => jest.fn(fn);

/**
 * Initializes the database for testing.
 * This can include creating a connection or running migrations.
 */
export const initTestDatabase = async (): Promise<void> => {
  console.log('Initializing test database...');
  // Add your database setup logic here
};

/**
 * Closes the database connection after testing.
 */
export const closeTestDatabase = async (): Promise<void> => {
  console.log('Closing test database...');
  // Add your database teardown logic here
};
