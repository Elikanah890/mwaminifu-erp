import { Router, Request, Response } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import {
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from '../validators/auth.validator';
import { loginLimiter, otpLimiter } from '../middlewares/rateLimit.middleware';

const router = Router();

/** Old OTP/PIN/username flows are retired. */
function gone(_req: Request, res: Response) {
  res.status(410).json({
    success: false,
    error: { code: 'GONE', message: 'Use email + password.' },
    timestamp: new Date().toISOString(),
  });
}

// Unified email + password authentication.
router.post('/login', loginLimiter, validate(loginSchema), authController.login.bind(authController));
router.post('/change-password', authMiddleware, validate(changePasswordSchema), authController.changePassword.bind(authController));
router.post('/forgot-password', otpLimiter, validate(forgotPasswordSchema), authController.forgotPassword.bind(authController));
router.post('/reset-password', loginLimiter, validate(resetPasswordSchema), authController.resetPassword.bind(authController));

// Session management.
router.post('/refresh', validate(refreshTokenSchema), authController.refresh.bind(authController));
router.post('/logout', authMiddleware, validate(refreshTokenSchema), authController.logout.bind(authController));

// Deprecated flows (kept as explicit 410 responses for old clients).
router.post('/otp/request', gone);
router.post('/otp/verify', gone);
router.post('/request-otp', gone);
router.post('/verify-otp', gone);
router.post('/pin/set', gone);
router.post('/pin/reset', gone);
router.post('/employee/login', gone);
router.post('/employee/change-pin', gone);
router.post('/admin/login', gone);

router.get('/users/me', authMiddleware, authController.getMe.bind(authController));
router.put('/users/me', authMiddleware, authController.updateProfile.bind(authController));

export default router;
