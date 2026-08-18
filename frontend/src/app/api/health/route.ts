import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';

export const dynamic = 'force-dynamic';

// GET /api/health — unauthenticated liveness/readiness probe for Cloud Run /
// Firebase App Hosting health checks and external uptime monitors. Verifies
// the process can actually reach MongoDB, not just that the container is up.
export async function GET() {
  try {
    await connectDB();
    return sendResponse(true, 'healthy', {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return sendResponse(false, 'unhealthy: database unreachable', null, 503);
  }
}
