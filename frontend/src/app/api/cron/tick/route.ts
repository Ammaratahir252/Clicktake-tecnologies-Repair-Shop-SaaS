import { NextRequest } from 'next/server';
import { runSchedulerTick } from '@/lib/scheduler';
import { sendResponse } from '@/utils/apiResponse';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/tick — external heartbeat for the platform scheduler.
 *
 * The in-process setInterval scheduler (lib/scheduler.ts) covers long-running
 * `next start`/dev servers, but on serverless hosting (Vercel) no process
 * persists between requests — this route is the reliable trigger there.
 * Wired up in vercel.json (crons) with Vercel sending `Authorization:
 * Bearer ${CRON_SECRET}` automatically once CRON_SECRET is set in env.
 *
 * Runs auto-backup, auto-suspend, storage checks, subscription-expiry alerts,
 * stuck-ticket escalations, and the daily report in one pass.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return sendResponse(false, 'CRON_SECRET is not configured — set it in the environment to enable external cron runs.', null, 503);
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return sendResponse(false, 'Unauthorized', null, 401);
  }

  await runSchedulerTick(true);
  return sendResponse(true, 'Scheduler tick completed');
}
