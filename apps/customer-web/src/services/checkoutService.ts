import { api } from './api';
import { ICheckoutPreview } from '../types/phase3';

export const checkoutService = {
  async getCheckoutPreview(addressId?: string, couponCode?: string): Promise<ICheckoutPreview> {
    const res = await api.post('/checkout/preview', {
      addressId: addressId || undefined,
      couponCode: couponCode || undefined,
    });
    return res.data.data.preview;
  },
};
