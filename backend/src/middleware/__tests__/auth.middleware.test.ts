import { UserRole } from '../../types';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorisedError,
  ForbiddenError,
  BusinessRuleError,
} from '../../errors';

// ─── Mock fastify req/rep factories ──────────────────────────
const makeReq = (overrides: Record<string, unknown> = {}) =>
  ({
    headers:   {},
    user:      undefined,
    tenantId:  undefined,
    ipAddress: undefined,
    ip:        '127.0.0.1',
    ...overrides,
  }) as unknown as import('fastify').FastifyRequest;

const makeRep = () => ({}) as unknown as import('fastify').FastifyReply;

// ─────────────────────────────────────────────────────────────
// authMiddleware
// ─────────────────────────────────────────────────────────────
import { authMiddleware } from '../authMiddleware';

describe('authMiddleware', () => {
  const makeToken = (payload: object) =>
    Buffer.from(JSON.stringify(payload)).toString('base64');

  it('sets req.user from valid base64 token', async () => {
    const payload = { userId: 'u1', role: UserRole.OWNER, email: 'a@b.com' };
    const req = makeReq({ headers: { authorization: `Bearer ${makeToken(payload)}` } });
    await authMiddleware(req, makeRep());
    expect(req.user).toMatchObject({ userId: 'u1', role: UserRole.OWNER });
  });

  it('sets req.ipAddress from x-forwarded-for header', async () => {
    const payload = { userId: 'u1', role: UserRole.OWNER, email: 'a@b.com' };
    const req = makeReq({
      headers: {
        authorization:    `Bearer ${makeToken(payload)}`,
        'x-forwarded-for': '1.2.3.4',
      },
    });
    await authMiddleware(req, makeRep());
    expect(req.ipAddress).toBe('1.2.3.4');
  });

  it('falls back to req.ip when x-forwarded-for absent', async () => {
    const payload = { userId: 'u1', role: UserRole.MANAGER, email: 'a@b.com' };
    const req = makeReq({
      headers: { authorization: `Bearer ${makeToken(payload)}` },
      ip: '9.9.9.9',
    });
    await authMiddleware(req, makeRep());
    expect(req.ipAddress).toBe('9.9.9.9');
  });

  it('throws UnauthorisedError when Authorization header missing', async () => {
    const req = makeReq({ headers: {} });
    await expect(authMiddleware(req, makeRep())).rejects.toBeInstanceOf(UnauthorisedError);
  });

  it('throws UnauthorisedError when scheme is not Bearer', async () => {
    const req = makeReq({ headers: { authorization: 'Basic abc123' } });
    await expect(authMiddleware(req, makeRep())).rejects.toBeInstanceOf(UnauthorisedError);
  });

  it('throws UnauthorisedError when token is invalid base64 JSON', async () => {
    const req = makeReq({ headers: { authorization: 'Bearer NOT_VALID_JSON!!!' } });
    await expect(authMiddleware(req, makeRep())).rejects.toBeInstanceOf(UnauthorisedError);
  });

  it('throws UnauthorisedError when Bearer token is empty string', async () => {
    const req = makeReq({ headers: { authorization: 'Bearer ' } });
    await expect(authMiddleware(req, makeRep())).rejects.toBeInstanceOf(UnauthorisedError);
  });
});

// ─────────────────────────────────────────────────────────────
// requireRole middleware
// ─────────────────────────────────────────────────────────────
import { requireRole } from '../roleMiddleware';

describe('requireRole', () => {
  const makeAuthedReq = (role: UserRole) =>
    makeReq({ user: { userId: 'u1', role, email: 'x@x.com' } });

  it('passes when user has required role', async () => {
    const mw = requireRole([UserRole.OWNER, UserRole.MANAGER]);
    const req = makeAuthedReq(UserRole.OWNER);
    await expect(mw(req, makeRep())).resolves.toBeUndefined();
  });

  it('passes when user has one of multiple allowed roles', async () => {
    const mw = requireRole([UserRole.MANAGER, UserRole.FRONTDESK]);
    const req = makeAuthedReq(UserRole.FRONTDESK);
    await expect(mw(req, makeRep())).resolves.toBeUndefined();
  });

  it('throws ForbiddenError when role not in allowed list', async () => {
    const mw = requireRole([UserRole.OWNER]);
    const req = makeAuthedReq(UserRole.DRIVER);
    await expect(mw(req, makeRep())).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('error message contains required roles', async () => {
    const mw = requireRole([UserRole.OWNER]);
    const req = makeAuthedReq(UserRole.CUSTOMER);
    try {
      await mw(req, makeRep());
    } catch (e) {
      expect((e as Error).message).toContain('owner');
    }
  });

  it('throws ForbiddenError for CUSTOMER trying owner route', async () => {
    const mw = requireRole([UserRole.OWNER, UserRole.MANAGER]);
    const req = makeAuthedReq(UserRole.CUSTOMER);
    await expect(mw(req, makeRep())).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('SUPER_ADMIN passes owner-only route', async () => {
    const mw = requireRole([UserRole.SUPER_ADMIN, UserRole.OWNER]);
    const req = makeAuthedReq(UserRole.SUPER_ADMIN);
    await expect(mw(req, makeRep())).resolves.toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// tenantMiddleware
// ─────────────────────────────────────────────────────────────
import { tenantMiddleware } from '../tenantMiddleware';

describe('tenantMiddleware', () => {
  it('sets req.tenantId from X-Tenant-ID header', async () => {
    const req = makeReq({ headers: { 'x-tenant-id': 'tenant-abc' } });
    await tenantMiddleware(req, makeRep());
    expect(req.tenantId).toBe('tenant-abc');
  });

  it('falls back to req.user.tenantId when header missing', async () => {
    const req = makeReq({
      headers: {},
      user: { userId: 'u1', role: UserRole.OWNER, tenantId: 'tenant-xyz' },
    });
    await tenantMiddleware(req, makeRep());
    expect(req.tenantId).toBe('tenant-xyz');
  });

  it('throws ForbiddenError when no tenantId anywhere', async () => {
    const req = makeReq({ headers: {}, user: undefined });
    await expect(tenantMiddleware(req, makeRep())).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('error message mentions X-Tenant-ID', async () => {
    const req = makeReq({ headers: {} });
    try {
      await tenantMiddleware(req, makeRep());
    } catch (e) {
      expect((e as Error).message).toContain('X-Tenant-ID');
    }
  });

  it('header takes priority over user tenantId', async () => {
    const req = makeReq({
      headers: { 'x-tenant-id': 'from-header' },
      user: { userId: 'u1', role: UserRole.OWNER, tenantId: 'from-user' },
    });
    await tenantMiddleware(req, makeRep());
    expect(req.tenantId).toBe('from-header');
  });
});

// ─────────────────────────────────────────────────────────────
// Error classes — HTTP status mapping
// ─────────────────────────────────────────────────────────────
describe('error status codes for HTTP responses', () => {
  const cases: [string, AppError, number][] = [
    ['ValidationError',   new ValidationError('bad'),        400],
    ['UnauthorisedError', new UnauthorisedError(),           401],
    ['ForbiddenError',    new ForbiddenError(),              403],
    ['NotFoundError',     new NotFoundError('missing'),      404],
    ['BusinessRuleError', new BusinessRuleError('rule'),     422],
    ['AppError 500',      new AppError('server err', 500),   500],
  ];

  it.each(cases)('%s has correct statusCode %i', (_name, err, code) => {
    expect(err.statusCode).toBe(code);
  });

  it.each(cases)('%s isOperational is true', (_name, err) => {
    expect(err.isOperational).toBe(true);
  });
});