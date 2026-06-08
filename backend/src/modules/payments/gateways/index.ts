// ============================================================
// DibnowRepairSaaS — EasyPaisa Gateway (Pakistan)
// ============================================================

import crypto from 'crypto';
import axios from 'axios';
import { env } from '../../../config/env';
import { PaymentGateway } from '../../../types';
import { PaymentError } from '../../../errors';
import { paymentLogger } from '../../../utils/logger';
import {
  IPaymentGateway,
  PaymentGatewayInput,
  CreatePaymentResult,
  VerifyPaymentResult,
  RefundResult,
} from './gateway.interface';

const EASYPAISA_SANDBOX_URL = 'https://easypay.easypaisa.com.pk/tpg/';
const EASYPAISA_LIVE_URL = 'https://easypay.easypaisa.com.pk/tpg/';

export class EasyPaisaGateway implements IPaymentGateway {
  gateway = PaymentGateway.EASYPAISA;

  private generateHash(
    amount: string,
    orderRefNum: string,
    expiryDate: string,
    storeId: string
  ): string {
    const hashString = `amount=${amount}&expiryDate=${expiryDate}&orderRefNum=${orderRefNum}&storeId=${storeId}`;
    return crypto
      .createHmac('sha256', env.EASYPAISA_HASH_KEY || '')
      .update(hashString)
      .digest('base64');
  }

  async createPayment(input: PaymentGatewayInput): Promise<CreatePaymentResult> {
    try {
      const orderRefNum = `EP${Date.now()}`;
      const expiryDate = new Date(Date.now() + 30 * 60 * 1000)
        .toISOString()
        .slice(0, 16)
        .replace('T', ' ');
      const amount = input.amount.toFixed(2);

      const hash = this.generateHash(
        amount,
        orderRefNum,
        expiryDate,
        env.EASYPAISA_STORE_ID || ''
      );

      const payload = {
        storeId: env.EASYPAISA_STORE_ID,
        amount,
        postBackURL: `${env.APP_URL}/api/payments/easypaisa/callback`,
        orderRefNum,
        expiryDate,
        autoRedirect: 0,
        paymentMethod: 'MA_PAYMENT',
        emailAddr: input.customerEmail || '',
        mobileNum: '',
        signature: hash,
      };

      const response = await axios.post(EASYPAISA_SANDBOX_URL, payload);
      const data = response.data;

      paymentLogger.created(input.invoiceId, input.tenantId, 'easypaisa', input.amount);

      return {
        gatewayPaymentId: orderRefNum,
        gatewayOrderId: orderRefNum,
        redirectUrl: data.redirectURL,
        status: 'pending',
        rawResponse: data,
      };
    } catch (error) {
      if (error instanceof PaymentError) throw error;
      paymentLogger.failed(input.invoiceId, input.tenantId, 'easypaisa', 'network_error');
      throw new PaymentError('EasyPaisa payment request failed');
    }
  }

  async verifyPayment(gatewayPaymentId: string): Promise<VerifyPaymentResult> {
    return {
      gatewayPaymentId,
      status: 'pending',
      amount: 0,
      currency: 'PKR',
      rawResponse: { message: 'Verify via EasyPaisa callback' },
    };
  }

  async refundPayment(
    gatewayPaymentId: string,
    amount: number,
    reason: string
  ): Promise<RefundResult> {
    return {
      gatewayRefundId: `EP_REFUND_${gatewayPaymentId}`,
      status: 'pending' as 'processed',
      amount,
      rawResponse: { message: 'EasyPaisa refunds require manual processing', reason },
    };
  }
}

// ============================================================
// Cash / Bank Transfer Gateway — manual recording
// ============================================================
export class CashGateway implements IPaymentGateway {
  gateway = PaymentGateway.CASH;

  async createPayment(input: PaymentGatewayInput): Promise<CreatePaymentResult> {
    const referenceId = `CASH_${Date.now()}_${input.invoiceId.slice(-8)}`;
    paymentLogger.created(input.invoiceId, input.tenantId, 'cash', input.amount);
    return {
      gatewayPaymentId: referenceId,
      status: 'paid', // cash is immediately paid
      rawResponse: { type: 'cash', referenceId },
    };
  }

  async verifyPayment(gatewayPaymentId: string): Promise<VerifyPaymentResult> {
    return {
      gatewayPaymentId,
      status: 'paid',
      amount: 0,
      currency: 'USD',
      paidAt: new Date(),
      rawResponse: { type: 'cash' },
    };
  }

  async refundPayment(gatewayPaymentId: string, amount: number): Promise<RefundResult> {
    return {
      gatewayRefundId: `CASH_REFUND_${gatewayPaymentId}`,
      status: 'processed',
      amount,
      rawResponse: { type: 'cash_refund', message: 'Manual cash refund recorded' },
    };
  }
}

export class BankTransferGateway implements IPaymentGateway {
  gateway = PaymentGateway.BANK_TRANSFER;

  async createPayment(input: PaymentGatewayInput): Promise<CreatePaymentResult> {
    const referenceId = `BT_${Date.now()}_${input.invoiceId.slice(-8)}`;
    paymentLogger.created(input.invoiceId, input.tenantId, 'bank_transfer', input.amount);
    return {
      gatewayPaymentId: referenceId,
      status: 'pending', // bank transfers need manual confirmation
      rawResponse: { type: 'bank_transfer', referenceId },
    };
  }

  async verifyPayment(gatewayPaymentId: string): Promise<VerifyPaymentResult> {
    return {
      gatewayPaymentId,
      status: 'pending',
      amount: 0,
      currency: 'USD',
      rawResponse: { type: 'bank_transfer', message: 'Awaiting manual confirmation' },
    };
  }

  async refundPayment(gatewayPaymentId: string, amount: number): Promise<RefundResult> {
    return {
      gatewayRefundId: `BT_REFUND_${gatewayPaymentId}`,
      status: 'processed',
      amount,
      rawResponse: { type: 'bank_transfer_refund' },
    };
  }
}

// ============================================================
// Gateway Factory — returns correct gateway by type
// ============================================================
import { stripeGateway } from './stripe.gateway';
import { jazzCashGateway } from './jazzcash.gateway';

const easyPaisaGateway = new EasyPaisaGateway();
const cashGateway = new CashGateway();
const bankTransferGateway = new BankTransferGateway();

export const getGateway = (gateway: PaymentGateway): IPaymentGateway => {
  const gateways: Record<PaymentGateway, IPaymentGateway> = {
    [PaymentGateway.STRIPE]: stripeGateway,
    [PaymentGateway.JAZZCASH]: jazzCashGateway,
    [PaymentGateway.EASYPAISA]: easyPaisaGateway,
    [PaymentGateway.CASH]: cashGateway,
    [PaymentGateway.BANK_TRANSFER]: bankTransferGateway,
    [PaymentGateway.PAYPAL]: cashGateway, // PayPal placeholder — same interface
  };

  const g = gateways[gateway];
  if (!g) throw new PaymentError(`Gateway '${gateway}' is not supported`);
  return g;
};
