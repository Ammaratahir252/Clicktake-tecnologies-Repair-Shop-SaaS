import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Ticket from '@/models/ticket.model';
import CustomerModel from '@/models/customer.model';
import User from '@/models/user.model';

const Customer = CustomerModel as any;
import TenantPaymentConfig from '@/models/tenantPaymentConfig.model';
import Payment from '@/models/payment.model';
import { sendResponse } from '@/utils/apiResponse';
import { decrypt } from '@/lib/crypto';
import { createTransaction, EasyPaisaEnvironment } from '@/lib/payments/easypaisa';

// POST /api/payments/easypaisa/initiate — a customer (or staff, on the customer's
// behalf) pays a ticket's estimate directly to that shop, using the shop's own
// EasyPaisa merchant credentials (configured by the shop owner in Settings).
export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const tenantId = req.headers.get('x-tenant-id') ?? '';
    const userId   = req.headers.get('x-user-id')   ?? '';
    const role     = req.headers.get('x-role')      ?? '';
    if (!tenantId) return sendResponse(false, 'No shop associated with your account', null, 400);

    const { ticketId } = await req.json();
    if (!ticketId) return sendResponse(false, 'ticketId is required', null, 400);

    const ticket = await Ticket.findOne({ _id: ticketId, tenantId });
    if (!ticket) return sendResponse(false, 'Ticket not found', null, 404);
    if (!ticket.estimateAmount || ticket.estimateAmount <= 0) {
      return sendResponse(false, 'This ticket has no payable estimate', null, 400);
    }

    if (role === 'customer') {
      const user = await User.findById(userId).lean() as any;
      let customer: any = null;
      if (user?.phone) {
        customer = await Customer.findOne({ phone: user.phone, tenantId: new mongoose.Types.ObjectId(tenantId) }).lean();
      }
      if (!customer || String(ticket.customerId) !== String(customer._id)) {
        return sendResponse(false, 'Forbidden', null, 403);
      }
    }

    const config = await TenantPaymentConfig.findOne({ tenantId }).lean() as any;
    const gwConfig = config?.easypaisa;
    if (!gwConfig?.enabled) {
      return sendResponse(false, 'This shop has not enabled EasyPaisa payments yet', null, 400);
    }

    const environment: EasyPaisaEnvironment = gwConfig.environment || 'uat';
    const orderId = `INV-${ticket._id}-${Date.now()}`;

    const payment = await Payment.create({
      tenantId,
      kind: 'invoice',
      referenceId: ticket._id,
      amount: ticket.estimateAmount,
      currency: 'PKR',
      gateway: 'easypaisa',
      environment,
      status: 'pending',
      gatewayOrderId: orderId,
    });

    const result = await createTransaction(
      {
        storeId: gwConfig.storeId || '',
        hashKey: gwConfig.hashKeyEnc ? decrypt(gwConfig.hashKeyEnc) : '',
        username: gwConfig.usernameEnc ? decrypt(gwConfig.usernameEnc) : '',
        password: gwConfig.passwordEnc ? decrypt(gwConfig.passwordEnc) : '',
        environment,
      },
      {
        orderId,
        amount: ticket.estimateAmount,
        postBackUrl: `${process.env.APP_URL || 'http://localhost:3000'}/api/payments/easypaisa/callback`,
      }
    );

    if (!result.success) {
      payment.status = 'failed';
      payment.failureReason = result.error;
      payment.rawResponse = result.rawResponse as any;
      await payment.save();
      return sendResponse(false, result.error || 'EasyPaisa payment could not be started', null, 502);
    }

    payment.rawResponse = result.rawResponse as any;
    payment.gatewayTransactionId = result.transactionId;
    await payment.save();

    return sendResponse(true, 'Payment initiated', {
      paymentId: payment._id,
      redirectUrl: result.redirectUrl,
      responseDesc: result.responseDesc,
    });
  } catch (err: any) {
    return sendResponse(false, err.message || 'Server error', null, 500);
  }
}
