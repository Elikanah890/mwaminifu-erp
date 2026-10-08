import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  sub: string;
  role: string;
  shopId?: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload as object, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY || '30d',
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload as object, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY || '60d',
  } as jwt.SignOptions);
}

export function signTempToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload as object, env.JWT_SECRET, {
    expiresIn: '10m',
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
