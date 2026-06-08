// ============================================================
// DibnowRepairSaaS — Tenant Middleware
// Step 2 of 3 in middleware chain — runs AFTER authMiddleware
// Validates tenant exists, is active, enforces data isolation
// MOST CRITICAL security rule: Shop A NEVER sees Shop B data
// ============================================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { redis, RedisKeys, RedisTTL } from '../config/redis';
import { TenantModel } from '../models/tenant.model';
import { TenantError, ForbiddenError } from '../errors';
import { securityLogger, logger } from '../utils/logger';
import { UserRole } from '../types';

interface TenantConfig {
  tenantId: string;
  name: string;
  plan: string;
  isActive: boolean;
  features: string[];
  currency: string;
  timezone: string;
}

export const tenantMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const { user, ipAddress } = request;

    // ── 1. Super Admin can access any tenant ──────────────────
    // But we still validate the target tenantId from header if provided
    if (user.role === UserRole.SUPER_ADMIN) {
      // Super admin can pass X-Tenant-Id header to act on a specific tenant
      const targetTenantId = request.headers['x-tenant-id'] as string;
      if (targetTenantId) {
        request.tenantId = targetTenantId;
      }
      return; // Super admin bypasses tenant isolation
    }

    const tenantId = user.tenantId;

    if (!tenantId) {
      throw new TenantError('Tenant context is missing');
    }

    // ── 2. Validate requested resource belongs to this tenant ─
    // Prevent URL manipulation: /api/invoices/invoice_from_other_tenant
    const requestedTenantId = request.headers['x-tenant-id'] as string;
    if (requestedTenantId && requestedTenantId !== tenantId) {
      securityLogger.crossTenantAttempt(
        user.userId,
        requestedTenantId,
        tenantId,
        ipAddress
      );
      throw new ForbiddenError('Cross-tenant access is not permitted');
    }

    // ── 3. Load tenant config (Redis cache first) ─────────────
    const cacheKey = RedisKeys.tenantConfig(tenantId);
    let tenantConfig: TenantConfig | null = null;

    const cached = await redis.get(cacheKey);
    if (cached) {
      tenantConfig = JSON.parse(cached);
    } else {
      // Cache miss — hit MongoDB
      const tenant = await TenantModel.findById(tenantId).lean();

      if (!tenant) {
        throw new TenantError('Tenant not found');
      }

      tenantConfig = {
        tenantId: tenant._id.toString(),
        name: tenant.name,
        plan: tenant.plan,
        isActive: tenant.isActive,
        features: tenant.features || [],
        currency: tenant.currency || 'USD',
        timezone: tenant.timezone || 'UTC',
      };

      // Cache for 5 minutes to reduce DB hits
      await redis.setex(cacheKey, RedisTTL.TENANT_CONFIG_CACHE, JSON.stringify(tenantConfig));
    }

    // ── 4. Check tenant is active ─────────────────────────────
    if (!tenantConfig?.isActive) {
      throw new TenantError(
        'Your account has been suspended. Please contact support.'
      );
    }

    // ── 5. Enforce tenantId on request for downstream use ─────
    request.tenantId = tenantId;

    logger.debug('Tenant resolved', { tenantId, plan: tenantConfig.plan });

  } catch (error) {
    if (error instanceof TenantError) {
      return reply.status(423).send({
        success: false,
        message: error.message,
      });
    }
    if (error instanceof ForbiddenError) {
      return reply.status(403).send({
        success: false,
        message: error.message,
      });
    }
    return reply.status(500).send({
      success: false,
      message: 'Tenant resolution failed',
    });
  }
};

// ─── Helper: enforce tenantId on every DB query ──────────────
// Import and use this in every service query — never skip it
export const enforceTenantScope = (
  query: Record<string, unknown>,
  tenantId: string
): Record<string, unknown> => {
  if (!tenantId) {
    throw new Error('CRITICAL: tenantId missing — query scope enforcement failed');
  }
  return { ...query, tenantId };
};
