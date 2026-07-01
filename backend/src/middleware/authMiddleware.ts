import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorisedError } from '../errors';

export const authMiddleware = async (req: FastifyRequest, _rep: FastifyReply): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) throw new UnauthorisedError('Missing or invalid Authorization header');

  const token = authHeader.slice(7);
  try {
    // Dev mode: token is base64-encoded JSON { userId, role, email, tenantId }
    // Production: replace with jwt.verify(token, process.env.JWT_SECRET)
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    req.user = { userId: payload.userId, role: payload.role, email: payload.email };
    req.ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || '0.0.0.0';
  } catch {
    throw new UnauthorisedError('Invalid token');
  }
};
