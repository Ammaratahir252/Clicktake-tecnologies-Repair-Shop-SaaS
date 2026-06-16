import Fastify from 'fastify';
import { registerErrorHandler } from '../errorHandler';
import {
  AppError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  UnauthorisedError,
} from '../../errors';

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const buildApp = () => {
  const app = Fastify();
  registerErrorHandler(app);
  return app;
};

describe('registerErrorHandler', () => {
  it('returns 400 for ValidationError with fields', async () => {
    const app = buildApp();
    app.get('/test', async () => {
      throw new ValidationError('bad input', { email: 'Required' });
    });
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('bad input');
    expect(body.errors).toEqual({ email: 'Required' });
  });

  it('returns 400 for ValidationError without fields', async () => {
    const app = buildApp();
    app.get('/test', async () => { throw new ValidationError('invalid data'); });
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(400);
    expect(res.json().success).toBe(false);
  });

  it('returns 404 for NotFoundError', async () => {
    const app = buildApp();
    app.get('/test', async () => { throw new NotFoundError('not found'); });
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(404);
    expect(res.json().message).toBe('not found');
  });

  it('returns 403 for ForbiddenError', async () => {
    const app = buildApp();
    app.get('/test', async () => { throw new ForbiddenError(); });
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(403);
  });

  it('returns 401 for UnauthorisedError', async () => {
    const app = buildApp();
    app.get('/test', async () => { throw new UnauthorisedError(); });
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(401);
  });

  it('returns custom statusCode for AppError', async () => {
    const app = buildApp();
    app.get('/test', async () => { throw new AppError('custom error', 422); });
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(422);
    expect(res.json().message).toBe('custom error');
  });

  it('returns 500 for unhandled errors', async () => {
    const app = buildApp();
    app.get('/test', async () => { throw new Error('unexpected crash'); });
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(500);
    expect(res.json().message).toBe('Internal server error');
  });

  it('success field is always false on error', async () => {
    const app = buildApp();
    app.get('/test', async () => { throw new AppError('err', 500); });
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.json().success).toBe(false);
  });
});