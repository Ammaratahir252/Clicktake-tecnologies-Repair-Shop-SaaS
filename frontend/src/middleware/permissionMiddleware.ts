import { NextRequest, NextResponse } from 'next/server';
import { hasPermission } from '../lib/permissions';
// ✅ FIXED: Changed the old helper path to your current one
import { sendResponse } from '@/utils/apiResponse';

/**
 * Middleware factory to enforce action-based permissions.
 * Must be executed after authMiddleware.
 * @param action - The required action string for the route
 */
export function permissionMiddleware(action: string) {
  return async (req: any) => {
    // Role is extracted from the decoded JWT attached by authMiddleware
    const role = req.user?.role;

    // Validate permission using the central permissions map
    if (!role || !hasPermission(role, action)) {
      // ✅ FIXED: Updated to use sendResponse instead of errorResponse
      return sendResponse(false, "You do not have permission to perform this action", null, 403);
    }

    // Continue to the next handler if permission is granted
    return null; 
  };
}