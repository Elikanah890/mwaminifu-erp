import { z } from 'zod';

export const requestOtpSchema = z.object({
  phone: z.string().min(10).max(15),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(6),
});

export const setPinSchema = z.object({
  pin: z.string().length(6),
});

export const changePinSchema = z.object({
  currentPin: z.string().length(6),
  pin: z.string().length(6),
});

export const loginSchema = z.object({
  phone: z.string().min(10).max(15),
  pin: z.string().length(6),
});

export const employeeLoginSchema = z.object({
  phone: z.string().min(9).max(15),
  pin: z.string().min(4).max(6),
});

export const adminLoginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});
