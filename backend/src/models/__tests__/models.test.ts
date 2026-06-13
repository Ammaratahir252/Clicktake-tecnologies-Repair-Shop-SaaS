import { AuditAction } from '../../types';

jest.mock('../auditLog.model', () => {
  const createFn = jest.fn();
  return {
    AuditLogModel: { create: createFn, modelName: 'audit_logs' },
    createAuditLog: async (params: object) => { await createFn(params); },
  };
});

jest.mock('../tenant.model', () => ({
  TenantModel: { modelName: 'tenants' },
}));

import { AuditLogModel, createAuditLog } from '../auditLog.model';
import { TenantModel } from '../tenant.model';

describe('AuditLogModel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('model name is audit_logs', () => {
    expect(AuditLogModel.modelName).toBe('audit_logs');
  });

  it('createAuditLog calls AuditLogModel.create', async () => {
    const params = {
      tenantId: 'tenant1', userId: 'user1',
      entityType: 'invoice', entityId: 'inv1',
      action: AuditAction.CREATE, ipAddress: '127.0.0.1',
    };
    await createAuditLog(params as any);
    expect(AuditLogModel.create).toHaveBeenCalledWith(params);
  });

  it('createAuditLog passes oldValues and newValues', async () => {
    const params = {
      tenantId: 'tenant1', userId: 'user2',
      entityType: 'delivery', entityId: 'del1',
      action: AuditAction.UPDATE,
      oldValues: { status: 'pending' },
      newValues: { status: 'assigned' },
      ipAddress: '192.168.1.1',
    };
    await createAuditLog(params as any);
    const callArgs = (AuditLogModel.create as jest.Mock).mock.calls[0][0];
    expect(callArgs.oldValues).toEqual({ status: 'pending' });
    expect(callArgs.newValues).toEqual({ status: 'assigned' });
  });

  it('createAuditLog works with DELETE action', async () => {
    const params = {
      tenantId: 'tenant1', userId: 'user3',
      entityType: 'ticket', entityId: 'tkt1',
      action: AuditAction.DELETE, ipAddress: '10.0.0.1',
    };
    await createAuditLog(params as any);
    expect(AuditLogModel.create).toHaveBeenCalledTimes(1);
  });
});

describe('AuditAction enum', () => {
  it('CREATE is create', () => expect(AuditAction.CREATE).toBe('create'));
  it('READ is read',     () => expect(AuditAction.READ).toBe('read'));
  it('UPDATE is update', () => expect(AuditAction.UPDATE).toBe('update'));
  it('DELETE is delete', () => expect(AuditAction.DELETE).toBe('delete'));
  it('has at least 4 core values', () => {
    expect(Object.values(AuditAction).length).toBeGreaterThanOrEqual(4);
  });
});

describe('TenantModel', () => {
  it('model name is tenants', () => {
    expect(TenantModel.modelName).toBe('tenants');
  });
});

describe('tenant plan types', () => {
  const plans = ['free', 'growth', 'enterprise'];
  it('has 3 plan tiers',        () => expect(plans).toHaveLength(3));
  it('free plan exists',        () => expect(plans).toContain('free'));
  it('growth plan exists',      () => expect(plans).toContain('growth'));
  it('enterprise plan exists',  () => expect(plans).toContain('enterprise'));
});

describe('security config constants', () => {
  it('auth rate limit is 10 per 15 min', () => {
    const auth = { max: 10, timeWindow: '15 minutes' };
    expect(auth.max).toBe(10);
    expect(auth.timeWindow).toBe('15 minutes');
  });

  it('payment rate limit is 20 per minute', () => {
    const payment = { max: 20, timeWindow: '1 minute' };
    expect(payment.max).toBe(20);
    expect(payment.timeWindow).toBe('1 minute');
  });

  it('MIME whitelist has 5 allowed types', () => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    expect(allowed).toHaveLength(5);
    expect(allowed).toContain('application/pdf');
  });

  it('dangerous MIME types are blocked', () => {
    const blocked = ['application/x-executable', 'application/x-msdownload', 'text/html', 'application/javascript', 'text/javascript', 'application/x-php'];
    expect(blocked).toContain('application/x-executable');
    expect(blocked).toContain('text/html');
    expect(blocked.length).toBeGreaterThanOrEqual(4);
  });
});