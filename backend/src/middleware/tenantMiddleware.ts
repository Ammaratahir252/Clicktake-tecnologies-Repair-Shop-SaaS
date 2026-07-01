import { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError } from '../errors';

export const tenantMiddleware = async (req: FastifyRequest, _rep: FastifyReply): Promise<void> => {
  const tenantId =
    (req.headers['x-tenant-id'] as string) ||
    (req.user as unknown as { tenantId?: string })?.tenantId;

  if (!tenantId) throw new ForbiddenError('Tenant context missing. Include X-Tenant-ID header.');
  req.tenantId = tenantId;
};
