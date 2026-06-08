// ============================================================
// DibnowRepairSaaS — Auth Middleware
// Step 1 of 3 in middleware chain
// Validates JWT token, checks session blocklist
// Attaches decoded user payload to request
// ============================================================

import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { redis, isSessionBlocked } from '../config/redis';
import { JwtPayload } from '../types';
import { UnauthorizedError } from '../errors';
import { securityLogger } from '../utils/logger';

// Extend Fastify request type to carry our user payload
declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload;
    tenantId: string;
    sessionId: string;
    ipAddress: string;
  }
}

export const authMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const ip = request.ip || request.headers['x-forwarded-for'] as string || 'unknown';
    request.ipAddress = ip;

    // ── 1. Extract token from httpOnly cookie OR Authorization header ──
    let token: string | undefined;

    // Prefer cookie (more secure — not accessible by JS)
    const cookieToken = request.cookies?.['auth_token'];
    const headerToken = request.headers.authorization?.startsWith('Bearer ')
      ? request.headers.authorization.split(' ')[1]
      : undefined;

    token = cookieToken || headerToken;

    if (!token) {
      securityLogger.invalidToken(ip, request.url);
      throw new UnauthorizedError('No authentication token provided');
    }

    // ── 2. Verify JWT signature and expiry ────────────────────
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (jwtError: unknown) {
      const err = jwtError as Error;
      securityLogger.invalidToken(ip, request.url);

      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Session expired. Please log in again.');
      }
      if (err.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Invalid authentication token');
      }
      throw new UnauthorizedError('Authentication failed');
    }

    // ── 3. Check if session has been invalidated ──────────────
    // This handles: logout, password change, suspicious activity
    const blocked = await isSessionBlocked(decoded.sessionId);
    if (blocked) {
      securityLogger.invalidToken(ip, request.url);
      throw new UnauthorizedError('Session has been invalidated. Please log in again.');
    }

    // ── 4. Attach user context to request ─────────────────────
    request.user = decoded;
    request.tenantId = decoded.tenantId;
    request.sessionId = decoded.sessionId;

  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return reply.status(401).send({
        success: false,
        message: error.message,
      });
    }
    return reply.status(401).send({
      success: false,
      message: 'Authentication failed',
    });
  }
};
