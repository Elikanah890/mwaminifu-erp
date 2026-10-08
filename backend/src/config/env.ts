import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret',
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '30d',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '60d',
  MOCK_SMS: process.env.MOCK_SMS === 'true',
  MOCK_FCM: process.env.MOCK_FCM === 'true',
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  TRUST_PROXY: parseInt(process.env.TRUST_PROXY || '0', 10),

  // SMS gateway configuration. In production MOCK_SMS must be false and a real
  // provider must be configured; see SmsService for provider implementations.
  SMS_PROVIDER: process.env.SMS_PROVIDER || (process.env.MOCK_SMS === 'true' ? 'mock' : 'http'),
  SMS_API_URL: process.env.SMS_API_URL || '',
  SMS_API_KEY: process.env.SMS_API_KEY || '',
  SMS_API_SECRET: process.env.SMS_API_SECRET || '',
  SMS_SENDER_ID: process.env.SMS_SENDER_ID || 'MWAMINIFU',
  SMS_COST_PER_SEGMENT: parseFloat(process.env.SMS_COST_PER_SEGMENT || '0.02'),

  // Firebase Cloud Messaging (push notifications).
  FCM_SERVER_KEY: process.env.FCM_SERVER_KEY || '',
  FCM_API_URL: process.env.FCM_API_URL || 'https://fcm.googleapis.com/fcm/send',
};

export const isProduction = env.NODE_ENV === 'production';

/**
 * Fail fast on unsafe production configuration. Called once at startup so a
 * misconfigured deployment never serves traffic with mocked channels.
 */
export function validateProductionConfig(): void {
  if (!isProduction) return;

  const problems: string[] = [];

  if (env.MOCK_SMS) {
    problems.push('MOCK_SMS must be false in production (OTPs would be fixed to 123456).');
  }
  if (env.MOCK_FCM) {
    problems.push('MOCK_FCM must be false in production.');
  }
  if (!env.MOCK_SMS) {
    if (env.SMS_PROVIDER === 'mock') {
      problems.push('SMS_PROVIDER must be a real provider (e.g. beem/http) in production.');
    }
    if (env.SMS_PROVIDER === 'http' && (!env.SMS_API_URL || !env.SMS_API_KEY)) {
      problems.push('SMS_API_URL and SMS_API_KEY are required when SMS_PROVIDER=http.');
    }
  }
  if (!env.MOCK_FCM && !env.FCM_SERVER_KEY) {
    problems.push('FCM_SERVER_KEY is required when MOCK_FCM is false.');
  }

  if (problems.length > 0) {
    throw new Error(
      `Refusing to start: unsafe production configuration.\n - ${problems.join('\n - ')}`
    );
  }
}
