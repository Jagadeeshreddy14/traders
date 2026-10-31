import { api } from './api';
import { IServiceabilityResult } from '../types/phase3';

export const deliveryService = {
  async checkServiceability(pincode: string): Promise<IServiceabilityResult> {
    const res = await api.get(`/delivery/serviceability?pincode=${encodeURIComponent(pincode)}`);
    return res.data.data;
  },

  async getConfig(): Promise<{
    deliveryCharge: number;
    freeDeliveryThreshold: number;
    packagingCharge: number;
    minOrderAmount: number;
    defaultDeliveryWindow: string;
    supportedPincodesCount: number;
  }> {
    const res = await api.get('/delivery/config');
    return res.data.data;
  },
};
