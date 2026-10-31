import axios from 'axios';
import { env } from '../config/env';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

export interface IInitiatePaymentParams {
  merchantOrderId: string;
  amountPaise: number;
  redirectUrl?: string;
  orderNumber: string;
  userPhone?: string;
  userName?: string;
}

export interface IInitiatePaymentResponse {
  success: boolean;
  redirectUrl: string;
  phonepeOrderId?: string;
  merchantOrderId: string;
}

export interface IPhonePeOrderStatusResponse {
  orderId: string;
  merchantOrderId: string;
  state: 'COMPLETED' | 'FAILED' | 'PENDING';
  amount: number;
  paymentMode?: string;
  payReferenceId?: string;
  rawResponse?: Record<string, any>;
}

export class PhonePeService {
  private static cachedToken: string | null = null;
  private static tokenExpiresAt: number = 0; // Unix timestamp in seconds

  /**
   * Determine base URL based on environment
   */
  private static getBaseUrl(): string {
    return env.PHONEPE_ENV === 'PRODUCTION'
      ? 'https://api.phonepe.com/apis/pg'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
  }

  /**
   * Determine OAuth Token endpoint
   */
  private static getOAuthUrl(): string {
    return env.PHONEPE_ENV === 'PRODUCTION'
      ? 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token';
  }

  /**
   * Check if we are running with mock/test sandbox credentials
   */
  public static isMockMode(): boolean {
    return (
      env.NODE_ENV === 'test' ||
      env.PHONEPE_CLIENT_ID === 'SANDBOX_CLIENT_ID' ||
      env.PHONEPE_CLIENT_SECRET === 'SANDBOX_CLIENT_SECRET'
    );
  }

  /**
   * Retrieve valid OAuth token (O-Bearer) with caching
   */
  public static async getOAuthToken(): Promise<string> {
    const nowSec = Math.floor(Date.now() / 1000);
    // Reuse cached token if valid for at least 60 more seconds
    if (this.cachedToken && this.tokenExpiresAt > nowSec + 60) {
      return this.cachedToken;
    }

    if (this.isMockMode()) {
      this.cachedToken = 'mock_phonepe_oauth_access_token_' + Date.now();
      this.tokenExpiresAt = nowSec + 3600;
      return this.cachedToken;
    }

    try {
      const params = new URLSearchParams();
      params.append('client_id', env.PHONEPE_CLIENT_ID);
      params.append('client_secret', env.PHONEPE_CLIENT_SECRET);
      params.append('client_version', env.PHONEPE_CLIENT_VERSION);
      params.append('grant_type', 'client_credentials');

      const res = await axios.post(this.getOAuthUrl(), params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      });

      if (res.data?.access_token) {
        this.cachedToken = res.data.access_token;
        this.tokenExpiresAt = res.data.expires_at || nowSec + 3600;
        return res.data.access_token as string;
      }

      throw new Error('No access_token returned by PhonePe OAuth');
    } catch (error: any) {
      logger.error('Failed to obtain PhonePe OAuth token', {
        message: error.message,
        response: error.response?.data,
      });
      throw AppError.internal('Failed to authenticate with PhonePe payment service');
    }
  }

  /**
   * Initiate Payment session with PhonePe Checkout v2 Pay
   */
  public static async initiatePayment(
    params: IInitiatePaymentParams
  ): Promise<IInitiatePaymentResponse> {
    const { merchantOrderId, amountPaise, redirectUrl, orderNumber } = params;

    const finalRedirectUrl =
      redirectUrl || `${env.PHONEPE_REDIRECT_URL}?orderId=${merchantOrderId}`;

    if (this.isMockMode()) {
      logger.info('PhonePe [MOCK] initiatePayment called', {
        merchantOrderId,
        amountPaise,
        finalRedirectUrl,
      });
      return {
        success: true,
        redirectUrl: `${finalRedirectUrl}&mock=true&tx=${merchantOrderId}`,
        phonepeOrderId: `OMO_${Date.now()}_MOCK`,
        merchantOrderId,
      };
    }

    try {
      const token = await this.getOAuthToken();
      const endpoint = `${this.getBaseUrl()}/checkout/v2/pay`;

      const payload = {
        merchantOrderId,
        amount: amountPaise,
        expireAfter: 1200, // 20 minutes expiry
        paymentFlow: {
          type: 'PG_CHECKOUT',
          message: `Payment for Paven Traders Order #${orderNumber}`,
          merchantUrls: {
            redirectUrl: finalRedirectUrl,
          },
        },
        metaInfo: {
          storeName: env.STORE_NAME,
          orderNumber,
        },
      };

      const res = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `O-Bearer ${token}`,
        },
        timeout: 15000,
      });

      const data = res.data;
      const checkoutUrl = data?.redirectUrl || data?.data?.redirectUrl;
      const phonepeOrderId = data?.orderId || data?.data?.orderId;

      if (!checkoutUrl) {
        throw new Error('No redirect URL returned by PhonePe Pay API');
      }

      return {
        success: true,
        redirectUrl: checkoutUrl,
        phonepeOrderId,
        merchantOrderId,
      };
    } catch (error: any) {
      logger.error('PhonePe initiatePayment error', {
        message: error.message,
        response: error.response?.data,
      });
      throw AppError.internal(
        error.response?.data?.message || 'Payment gateway initialization failed'
      );
    }
  }

  /**
   * Check Transaction Status with PhonePe server-side
   */
  public static async checkOrderStatus(
    merchantOrderId: string
  ): Promise<IPhonePeOrderStatusResponse> {
    if (this.isMockMode()) {
      logger.info('PhonePe [MOCK] checkOrderStatus', { merchantOrderId });
      const { Payment } = await import('../models/Payment');
      const p = await Payment.findOne({ merchantTransactionId: merchantOrderId });
      const verifiedAmount = p ? p.amount : 10000;

      return {
        orderId: `OMO_${Date.now()}_MOCK`,
        merchantOrderId,
        state: 'COMPLETED',
        amount: verifiedAmount,
        paymentMode: 'UPI',
        payReferenceId: `T_${Date.now()}`,
        rawResponse: { mock: true, state: 'COMPLETED' },
      };
    }

    try {
      const token = await this.getOAuthToken();
      const endpoint = `${this.getBaseUrl()}/checkout/v2/order/${merchantOrderId}/status?details=true`;

      const res = await axios.get(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `O-Bearer ${token}`,
        },
        timeout: 10000,
      });

      const data = res.data;
      const latestPayment = data.paymentDetails?.[0];

      return {
        orderId: data.orderId || `OMO_${Date.now()}`,
        merchantOrderId: data.merchantOrderId || merchantOrderId,
        state: data.state, // 'COMPLETED' | 'FAILED' | 'PENDING'
        amount: data.amount,
        paymentMode: latestPayment?.paymentMode || 'ONLINE',
        payReferenceId: latestPayment?.payReferenceId,
        rawResponse: data,
      };
    } catch (error: any) {
      logger.error('PhonePe checkOrderStatus error', {
        message: error.message,
        merchantOrderId,
        response: error.response?.data,
      });

      // If status check fails with 404 or network timeout, return PENDING for safe reconciliation
      return {
        orderId: '',
        merchantOrderId,
        state: 'PENDING',
        amount: 0,
        rawResponse: error.response?.data,
      };
    }
  }

  /**
   * Verify Webhook Authentication
   * Validates incoming Authorization header against configured credentials (Basic Auth or custom SHA)
   */
  public static verifyWebhookAuth(authHeader?: string): boolean {
    if (!authHeader) {
      return false;
    }

    // Check Basic Auth
    if (authHeader.startsWith('Basic ')) {
      const base64Credentials = authHeader.substring(6).trim();
      const decoded = Buffer.from(base64Credentials, 'base64').toString('utf8');
      const [username, password] = decoded.split(':');

      if (
        username === env.PHONEPE_WEBHOOK_USERNAME &&
        password === env.PHONEPE_WEBHOOK_PASSWORD
      ) {
        return true;
      }
    }

    // Direct token or mock match
    if (
      authHeader === `Basic ${Buffer.from(`${env.PHONEPE_WEBHOOK_USERNAME}:${env.PHONEPE_WEBHOOK_PASSWORD}`).toString('base64')}` ||
      authHeader === 'mock_phonepe_webhook_token'
    ) {
      return true;
    }

    return false;
  }
}
