import { api } from './api';

export interface IInitiatePaymentResponse {
  success: boolean;
  redirectUrl: string;
  merchantTransactionId: string;
  orderId: string;
  orderNumber: string;
}

export const paymentService = {
  /**
   * Initiate PhonePe online payment session
   */
  initiatePhonePePayment: async (params: {
    orderId: string;
    returnUrl?: string;
  }): Promise<IInitiatePaymentResponse> => {
    const res = await api.post('/payments/phonepe/initiate', params);
    return res.data.data;
  },

  /**
   * Check & Reconcile Payment Status
   */
  checkPaymentStatus: async (orderId: string): Promise<{ order: any; payment: any }> => {
    const res = await api.get(`/payments/${orderId}/status`);
    return res.data.data;
  },
};
