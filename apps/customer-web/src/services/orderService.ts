import { api } from './api';
import { IOrder } from '../types/phase4';

export interface ICreateOrderPayload {
  addressId: string;
  paymentMethod: 'COD' | 'ONLINE' | 'PHONEPE' | 'UPI';
  couponCode?: string;
  idempotencyKey?: string;
}

export const orderService = {
  /**
   * Place order from customer's MongoDB cart
   */
  createOrder: async (payload: ICreateOrderPayload): Promise<{ order: IOrder; payment: any }> => {
    const res = await api.post('/orders', payload, {
      headers: payload.idempotencyKey ? { 'x-idempotency-key': payload.idempotencyKey } : undefined,
    });
    return res.data.data;
  },

  /**
   * Get single order by ID
   */
  getOrderById: async (orderId: string): Promise<IOrder> => {
    const res = await api.get(`/orders/${orderId}`);
    return res.data.data.order;
  },

  /**
   * Get customer's order history
   */
  getMyOrders: async (): Promise<IOrder[]> => {
    const res = await api.get('/orders');
    return res.data.data.orders;
  },

  /**
   * Get structured Invoice data
   */
  getInvoiceData: async (orderId: string): Promise<any> => {
    const res = await api.get(`/orders/${orderId}/invoice`);
    return res.data.data.invoice;
  },
};
