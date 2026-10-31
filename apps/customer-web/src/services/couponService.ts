import { api } from './api';
import { ICoupon } from '../types/phase3';

export const couponService = {
  async getActiveCoupons(): Promise<ICoupon[]> {
    const res = await api.get('/coupons/active');
    return res.data.data.coupons;
  },

  async validateCoupon(code: string, subtotalPaise: number): Promise<{
    valid: boolean;
    coupon?: ICoupon;
    discountPaise: number;
    message: string;
  }> {
    const res = await api.post('/coupons/validate', { code, subtotalPaise });
    return res.data.data;
  },
};
