// ============================================================
// DibnowRepairSaaS — JazzCash Gateway (Pakistan)
// Mobile wallet + debit card payments
// Uses HMAC-SHA256 for request signing
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

const JAZZCASH_SANDBOX_URL = 'https://sandbox.jazzcash.com.pk/ApplicationAPI/API';
const JAZZCASH_LIVE_URL = 'https://payments.jazzcash.com.pk/ApplicationAPI/API';

export class JazzCashGateway implements IPaymentGateway {
  gateway = PaymentGateway.JAZZCASH;

  private get baseUrl(): string {
    return env.NODE_ENV === 'production' ? JAZZCASH_LIVE_URL : JAZZCASH_SANDBOX_URL;
  }

  // ─── Generate HMAC-SHA256 secure hash ──────────────────────
  private generateHash(params: Record<string, string>): string {
    // JazzCash requires specific field order for hash
    const sortedKeys = Object.keys(params).sort();
    const hashString = env.JAZZCASH_INTEGRITY_SALT +
      '&' +
      sortedKeys.map((k) => params[k]).join('&');

    return crypto
      .createHmac('sha256', env.JAZZCASH_INTEGRITY_SALT || '')
      .update(hashString)
      .digest('hex')
      .toUpperCase();
  }

  private formatAmount(amount: number): string {
    // JazzCash requires amount in paisas (PKR cents)
    return Math.round(amount * 100).toString();
  }

  private getDateTime(): string {
    return new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .slice(0, 14);
  }

  async createPayment(input: PaymentGatewayInput): Promise<CreatePaymentResult> {
    try {
      const txnRefNo = `TXN${Date.now()}`;
      const dateTime = this.getDateTime();
      const expiryDateTime = new Date(Date.now() + 30 * 60 * 1000)
        .toISOString()
        .replace(/[-:T.Z]/g, '')
        .slice(0, 14);

      const params: Record<string, string> = {
        pp_Version: '1.1',
        pp_TxnType: 'MWALLET',
        pp_Language: 'EN',
        pp_MerchantID: env.JAZZCASH_MERCHANT_ID || '',
        pp_Password: env.JAZZCASH_PASSWORD || '',
        pp_TxnRefNo: txnRefNo,
        pp_Amount: this.formatAmount(input.amount),
        pp_TxnCurrency: 'PKR',
        pp_TxnDateTime: dateTime,
        pp_BillReference: input.invoiceId,
        pp_Description: input.description,
        pp_TxnExpiryDateTime: expiryDateTime,
        pp_ReturnURL: `${env.APP_URL}/api/payments/jazzcash/callback`,
        ppmpf_1: input.tenantId,
        ppmpf_2: input.customerId,
        ppmpf_3: input.invoiceId,
      };

      params.pp_SecureHash = this.generateHash(params);

      const response = await axios.post(
        `${this.baseUrl}/2.0/Purchase/DoMWalletTransaction`,
        params
      );

      const data = response.data;

      paymentLogger.created(input.invoiceId, input.tenantId, 'jazzcash', input.amount);

      if (data.pp_ResponseCode === '000') {
        return {
          gatewayPaymentId: data.pp_TxnRefNo || txnRefNo,
          gatewayOrderId: txnRefNo,
          status: 'paid',
          rawResponse: data,
        };
      }

      // Pending — awaiting OTP confirmation from customer
      if (data.pp_ResponseCode === '124') {
        return {
          gatewayPaymentId: txnRefNo,
          gatewayOrderId: txnRefNo,
          status: 'pending',
          rawResponse: data,
        };
      }

      throw new PaymentError(
        data.pp_ResponseMessage || 'JazzCash payment failed',
        data.pp_ResponseCode
      );
    } catch (error) {
      if (error instanceof PaymentError) throw error;
      paymentLogger.failed(input.invoiceId, input.tenantId, 'jazzcash', 'network_error');
      throw new PaymentError('JazzCash payment request failed');
    }
  }

  async verifyPayment(gatewayPaymentId: string): Promise<VerifyPaymentResult> {
    try {
      const params: Record<string, string> = {
        pp_Version: '1.1',
        pp_TxnType: 'MWALLET',
        pp_Language: 'EN',
        pp_MerchantID: env.JAZZCASH_MERCHANT_ID || '',
        pp_Password: env.JAZZCASH_PASSWORD || '',
        pp_TxnRefNo: gatewayPaymentId,
      };

      params.pp_SecureHash = this.generateHash(params);

      const response = await axios.post(
        `${this.baseUrl}/2.0/Inquiry/GetTransactionStatus`,
        params
      );

      const data = response.data;

      return {
        gatewayPaymentId,
        status: data.pp_ResponseCode === '000' ? 'paid' : 'failed',
        amount: parseInt(data.pp_Amount || '0') / 100,
        currency: 'PKR',
        paidAt: data.pp_ResponseCode === '000' ? new Date() : undefined,
        rawResponse: data,
      };
    } catch {
      throw new PaymentError('JazzCash payment verification failed');
    }
  }

  async refundPayment(
    gatewayPaymentId: string,
    amount: number,
    reason: string
  ): Promise<RefundResult> {
    // JazzCash refunds must be processed manually through merchant portal
    // Return pending status and handle manually
    return {
      gatewayRefundId: `REFUND_${gatewayPaymentId}`,
      status: 'pending' as 'processed',
      amount,
      rawResponse: {
        message: 'JazzCash refunds require manual processing via merchant portal',
        originalPaymentId: gatewayPaymentId,
        reason,
      },
    };
  }
}

export const jazzCashGateway = new JazzCashGateway();
