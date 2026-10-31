/**
 * Paven Traders - Shared Core Constants, Enums & Interfaces
 */

// 1. Roles & Permissions
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  DELIVERY_PARTNER = 'DELIVERY_PARTNER',
}

// 2. Order & Commerce Enums
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentProvider {
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  RAZORPAY = 'RAZORPAY',
  STRIPE = 'STRIPE',
}

export enum DeliveryPartnerStatus {
  AVAILABLE = 'AVAILABLE',
  ON_DELIVERY = 'ON_DELIVERY',
  OFFLINE = 'OFFLINE',
}

export enum VehicleType {
  BICYCLE = 'BICYCLE',
  MOTORCYCLE = 'MOTORCYCLE',
  SCOOTER = 'SCOOTER',
  VAN = 'VAN',
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

// 3. User & Auth Contracts
export interface IUserSafe {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface IAuthResponse {
  user: IUserSafe;
  tokens: IAuthTokens;
}

export interface IJwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  tokenVersion?: number;
}

// 4. API Standard Wrapper
export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code?: string;
    details?: any;
  };
  timestamp: string;
}

// 5. Health Check Response Contract
export interface IHealthStatus {
  server: 'healthy' | 'degraded' | 'unhealthy';
  database: 'connected' | 'disconnected' | 'connecting' | 'disconnecting' | 'unknown';
  apiVersion: string;
  timestamp: string;
  uptimeSeconds: number;
}
