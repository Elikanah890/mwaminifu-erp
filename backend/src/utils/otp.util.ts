import { v4 as uuidv4 } from 'uuid';
import { randomInt, randomBytes } from 'crypto';
import { env } from '../config/env';

export function generateOtp(): string {
  if (env.MOCK_SMS) {
    return '123456';
  }
  return randomInt(100000, 1000000).toString();
}

export function generateUniqueId(): string {
  return uuidv4();
}

export function generateReceiptNumber(): string {
  const prefix = 'INV';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateTempPin(): string {
  return randomInt(100000, 1000000).toString();
}

/** URL-safe temporary password (12 chars) for welcome emails. */
export function generateTempPassword(): string {
  return randomBytes(9).toString('base64url');
}
