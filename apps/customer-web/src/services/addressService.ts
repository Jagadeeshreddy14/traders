import { api } from './api';
import { IAddress } from '../types/phase3';

export const addressService = {
  async getAddresses(): Promise<IAddress[]> {
    const res = await api.get('/addresses');
    return res.data.data.addresses;
  },

  async getAddressById(id: string): Promise<IAddress> {
    const res = await api.get(`/addresses/${id}`);
    return res.data.data.address;
  },

  async createAddress(addressData: Partial<IAddress>): Promise<IAddress> {
    const res = await api.post('/addresses', addressData);
    return res.data.data.address;
  },

  async updateAddress(id: string, addressData: Partial<IAddress>): Promise<IAddress> {
    const res = await api.put(`/addresses/${id}`, addressData);
    return res.data.data.address;
  },

  async setDefaultAddress(id: string): Promise<IAddress> {
    const res = await api.patch(`/addresses/${id}/default`);
    return res.data.data.address;
  },

  async deleteAddress(id: string): Promise<void> {
    await api.delete(`/addresses/${id}`);
  },
};
