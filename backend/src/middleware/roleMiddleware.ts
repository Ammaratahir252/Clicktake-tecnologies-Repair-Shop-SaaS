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
// ============================================================
// Permission-based middleware — resource + action level checks
// ============================================================

type Resource = 'invoices' | 'payments';
type Action   = 'create' | 'read' | 'approve';

// Permission matrix: role → resource → allowed actions
const PERMISSIONS: Record<UserRole, Partial<Record<Resource, Action[]>>> = {
  [UserRole.SUPER_ADMIN]: {
    invoices: ['create', 'read', 'approve'],
    payments: ['create', 'read', 'approve'],
  },
  [UserRole.OWNER]: {
    invoices: ['create', 'read', 'approve'],
    payments: ['create', 'read', 'approve'],
  },
  [UserRole.MANAGER]: {
    invoices: ['create', 'read', 'approve'],
    payments: ['create', 'read', 'approve'],
  },
  [UserRole.FRONTDESK]: {
    invoices: ['create', 'read'],
    payments: ['create', 'read'],
  },
  
  [UserRole.DRIVER]: {},
  [UserRole.CUSTOMER]: {
    invoices: ['read', 'approve'], // approve = accept/reject their own estimate
    payments: ['read'],
  },
};

export const roleMiddleware = (resource: Resource, action: Action) =>
  async (req: FastifyRequest, _rep: FastifyReply): Promise<void> => {
    const userRole = req.user?.role as UserRole;
    const allowedActions = PERMISSIONS[userRole]?.[resource] || [];

    if (!allowedActions.includes(action)) {
      throw new ForbiddenError(
        `Access denied. Role '${userRole}' cannot '${action}' on '${resource}'.`
      );
    }
  };
