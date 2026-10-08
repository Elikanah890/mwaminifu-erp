import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

export function generateOtp(): string {
  if (env.MOCK_SMS) {
    return '123456';
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
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
  return Math.floor(100000 + Math.random() * 900000).toString();
}
