import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('5000'),
  API_PREFIX: z.string().default('/api/v1'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/paven_traders'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long').default('paven_traders_access_secret_key_minimum_32_characters_super_secure!'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long').default('paven_traders_refresh_secret_key_minimum_32_characters_super_secure!'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:5174'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('10'),
  INITIAL_ADMIN_NAME: z.string().default('Store Administrator'),
  INITIAL_ADMIN_EMAIL: z.string().email().default('admin@paventraders.com'),
  INITIAL_ADMIN_PASSWORD: z.string().default('Admin@SecurePassword123!'),
  INITIAL_ADMIN_PHONE: z.string().default('+919876543210'),

  // Phase 4: PhonePe Payment Gateway configuration
  PHONEPE_ENV: z.enum(['SANDBOX', 'PRODUCTION']).default('SANDBOX'),
  PHONEPE_CLIENT_ID: z.string().default('SANDBOX_CLIENT_ID'),
  PHONEPE_CLIENT_SECRET: z.string().default('SANDBOX_CLIENT_SECRET'),
  PHONEPE_CLIENT_VERSION: z.string().default('1'),
  PHONEPE_MERCHANT_ID: z.string().default('PGTESTPAYUAT'),
  PHONEPE_WEBHOOK_USERNAME: z.string().default('paven_webhook_user'),
  PHONEPE_WEBHOOK_PASSWORD: z.string().default('paven_webhook_secret_pass'),
  PHONEPE_REDIRECT_URL: z.string().default('http://localhost:5173/payment/callback'),

  // Phase 4: Store & Inventory Reservation Configuration
  INVENTORY_RESERVATION_EXPIRY_MINUTES: z.string().transform(Number).default('15'),
  STORE_NAME: z.string().default('Paven Traders'),
  STORE_PHONE: z.string().default('+91 98765 43210'),
  STORE_EMAIL: z.string().default('support@paventraders.com'),
  STORE_ADDRESS: z.string().default('Shop #4, Paven Complex, Main Road, City Center - 500001'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Environment validation failed:', JSON.stringify(result.error.format(), null, 2));
    throw new Error('Invalid environment configuration');
  }
  return result.data;
};

export const env = parseEnv();
