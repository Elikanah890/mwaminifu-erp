import { z } from 'zod';

const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const newPassword = z.string().min(8).max(128);

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export const changePasswordSchema = z.object({
  newPassword,
});

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(256),
  newPassword,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export const changeAdminPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword,
});

// Legacy shapes remain exported for already-compiled clients/tests only.
// Their routes return 410 Gone.
export const requestOtpSchema = z.object({ phone: z.string().min(10).max(15) });
export const verifyOtpSchema = z.object({ phone: z.string().min(10).max(15), otp: z.string().length(6) });
export const setPinSchema = z.object({ pin: z.string().length(6) });
export const changePinSchema = z.object({ currentPin: z.string().length(6), pin: z.string().length(6) });
export const employeeLoginSchema = z.object({ phone: z.string().min(9).max(15), pin: z.string().min(4).max(6) });
export const adminLoginSchema = z.object({ username: z.string().min(3), password: z.string().min(6) });
