// ============================================================
// DibnowRepairSaaS — Role Middleware (RBAC)
// Step 3 of 3 in middleware chain — runs AFTER tenantMiddleware
// Checks: does this role have permission for this resource+action?
// ============================================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, ROLE_PERMISSIONS, ResourceAction } from '../types';
import { ForbiddenError } from '../errors';
import { securityLogger } from '../utils/logger';

// ─── Factory: creates a middleware for a specific resource+action
// Usage: roleMiddleware('invoices', 'create')
export const roleMiddleware = (
  resource: string,
  action: ResourceAction
) => {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const { user, ipAddress } = request;

      if (!user || !user.role) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
        });
      }

      const hasPermission = checkPermission(user.role, resource, action);

      if (!hasPermission) {
        securityLogger.forbiddenAccess(user.userId, user.role, resource, action);
        throw new ForbiddenError(
          `Role '${user.role}' is not permitted to ${action} ${resource}`
        );
      }

    } catch (error) {
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({
          success: false,
          message: error.message,
        });
      }
      return reply.status(403).send({
        success: false,
        message: 'Permission check failed',
      });
    }
  };
};

// ─── Core permission check logic ─────────────────────────────
export const checkPermission = (
  role: UserRole,
  resource: string,
  action: ResourceAction
): boolean => {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;

  return permissions.some((rule) => {
    // Wildcard: super_admin has rule { resource: '*', actions: [...all] }
    const resourceMatch = rule.resource === '*' || rule.resource === resource;
    const actionMatch = rule.actions.includes(action);
    return resourceMatch && actionMatch;
  });
};

// ─── Multi-role check: allow if user has ANY of the roles ────
// Usage: requireRole([UserRole.OWNER, UserRole.MANAGER])
export const requireRole = (allowedRoles: UserRole[]) => {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const { user } = request;

    if (!user) {
      return reply.status(401).send({ success: false, message: 'Authentication required' });
    }

    if (!allowedRoles.includes(user.role)) {
      securityLogger.forbiddenAccess(
        user.userId,
        user.role,
        'role_check',
        `require_one_of: ${allowedRoles.join(',')}`
      );
      return reply.status(403).send({
        success: false,
        message: `Access restricted to: ${allowedRoles.join(', ')}`,
      });
    }
  };
};

// ─── Ownership check: ensure resource belongs to this user/tenant
// Use in service layer for fine-grained checks
export const assertTenantOwnership = (
  resourceTenantId: string,
  requestTenantId: string,
  resourceName: string
): void => {
  if (resourceTenantId !== requestTenantId) {
    throw new ForbiddenError(
      `You do not have access to this ${resourceName}`
    );
  }
};

// ─── Customer self-check: customer can only access their own data
export const assertCustomerOwnership = (
  resourceCustomerId: string,
  requestUserId: string,
  role: UserRole,
  resourceName: string
): void => {
  // Staff roles can access any customer's data within their tenant
  const staffRoles = [
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.FRONTDESK,
    UserRole.TECHNICIAN,
    UserRole.SUPER_ADMIN,
  ];

  if (staffRoles.includes(role)) return;

  // Customer can only see their own data
  if (resourceCustomerId !== requestUserId) {
    throw new ForbiddenError(
      `You can only access your own ${resourceName}`
    );
  }
};
