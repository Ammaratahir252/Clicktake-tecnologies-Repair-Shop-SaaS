import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import Customer from '@/models/customer.model';
import { sendResponse } from '@/utils/apiResponse';
import { createAuditLog } from '@/services/auditLog.service';
import { AUDIT_ACTIONS } from '@/models/auditLog.model';
import { sendEmail, emailAccountDeleted } from '@/lib/notifications';

import { canAccess } from '@/lib/adminAccess';
function isSuperAdmin(req: NextRequest) {
  return canAccess(req, 'customers');
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isSuperAdmin(req)) return sendResponse(false, 'Forbidden', null, 403);
  await connectDB();
  try {
    const customer = await (Customer as any).findByIdAndDelete(params.id).lean();
    if (!customer) return sendResponse(false, 'Customer not found', null, 404);

    const superAdminId = req.headers.get('x-user-id') || 'unknown';
    if (superAdminId !== 'unknown') {
      createAuditLog({
        tenantId: customer.tenantId ? customer.tenantId.toString() : params.id,
        userId: superAdminId,
        action: AUDIT_ACTIONS.CUSTOMER_DELETED,
        entity: 'customer',
        entityId: params.id,
        details: { deletedName: customer.name, deletedPhone: customer.phone },
        ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      });
    }

    if (customer.email) {
      sendEmail(
        customer.email,
        'Your Customer Account Has Been Removed',
        emailAccountDeleted(customer.name || 'there', 'customer')
      ).catch(() => {});
    }

    return sendResponse(true, 'Customer permanently deleted');
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
