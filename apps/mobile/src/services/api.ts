import axios, { InternalAxiosRequestConfig } from 'axios';
import { secureStorage } from './storage';

// Default to standard Android emulator loopback or localhost
export const API_BASE_URL = 'http://10.0.2.2:5000/api/v1';

export const mobileApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

mobileApi.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await secureStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
