import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '../types';
import { ForbiddenError } from '../errors';

export const requireRole = (allowedRoles: UserRole[]) =>
  async (req: FastifyRequest, _rep: FastifyReply): Promise<void> => {
    const userRole = req.user?.role as UserRole;
    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenError(
        `Access denied. Required: ${allowedRoles.join(', ')}. Your role: ${userRole}`
      );
    }
  };
