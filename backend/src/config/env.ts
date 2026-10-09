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

  // Seed / test account credentials (used only by `prisma/seed.ts`). In
  // production these MUST be supplied explicitly — the seed refuses to run with
  // the insecure defaults when NODE_ENV=production.
  SYSTEM_OWNER_USERNAME: process.env.SYSTEM_OWNER_USERNAME || '',
  SYSTEM_OWNER_PASSWORD: process.env.SYSTEM_OWNER_PASSWORD || '',
  AGENT_TEST_USERNAME: process.env.AGENT_TEST_USERNAME || '',
  AGENT_TEST_PASSWORD: process.env.AGENT_TEST_PASSWORD || '',

  // Explicit opt-in to allow mocked SMS/FCM outside local development (used for
  // free-VPS client testing where a real SMS gateway is not wired up). Keep this
  // UNSET for real production.
  ALLOW_MOCK_MESSAGING: process.env.ALLOW_MOCK_MESSAGING === 'true',

  // Temporary client-testing switch: greatly raises auth/OTP/general rate limits
  // and lets the System Owner sign in without being blocked by the 2-session cap.
  // Is also implied by MOCK_SMS + ALLOW_MOCK_MESSAGING.
  RATE_LIMIT_RELAXED: process.env.RATE_LIMIT_RELAXED === 'true',

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
 * Temporary client-testing mode: relaxed rate limits and no System Owner session
 * cap. Enabled explicitly or whenever mocked messaging is permitted in prod.
 */
export const isTestingMode = env.RATE_LIMIT_RELAXED || (env.MOCK_SMS && env.ALLOW_MOCK_MESSAGING);

/**
 * Fail fast on unsafe production configuration. Called once at startup so a
 * misconfigured deployment never serves traffic with mocked channels.
 */
export function validateProductionConfig(): void {
  if (!isProduction) return;

  const problems: string[] = [];
  const allowMock = env.ALLOW_MOCK_MESSAGING;

  if (env.MOCK_SMS && !allowMock) {
    problems.push('MOCK_SMS must be false in production (OTPs would be fixed to 123456). Set ALLOW_MOCK_MESSAGING=true only for temporary client testing.');
  }
  if (env.MOCK_FCM && !allowMock) {
    problems.push('MOCK_FCM must be false in production. Set ALLOW_MOCK_MESSAGING=true only for temporary client testing.');
  }
  if (allowMock) {
    // Loud warning so this is never left on unnoticed.
    // eslint-disable-next-line no-console
    console.warn('[SECURITY] ALLOW_MOCK_MESSAGING=true — mocked SMS/FCM is enabled in production. Disable for real launch.');
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
