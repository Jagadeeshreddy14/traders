import { api } from './api';
import { ICartDetails } from '../types/phase3';

export const cartService = {
  async getCart(): Promise<ICartDetails> {
    const res = await api.get('/cart');
    return res.data.data.cart;
  },

  async addItem(productId: string, quantity = 1): Promise<ICartDetails> {
    const res = await api.post('/cart/items', { productId, quantity });
    return res.data.data.cart;
  },

  async updateQuantity(productId: string, quantity: number): Promise<ICartDetails> {
    const res = await api.put(`/cart/items/${productId}`, { quantity });
    return res.data.data.cart;
  },

  async removeItem(productId: string): Promise<ICartDetails> {
    const res = await api.delete(`/cart/items/${productId}`);
    return res.data.data.cart;
  },

  async clearCart(): Promise<ICartDetails> {
    const res = await api.delete('/cart');
    return res.data.data.cart;
  },

  async syncCart(items: Array<{ productId: string; quantity: number }>): Promise<ICartDetails> {
    const res = await api.post('/cart/sync', { items });
    return res.data.data.cart;
  },
};
