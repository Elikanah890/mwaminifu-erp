import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { requestOtpSchema, verifyOtpSchema, setPinSchema, loginSchema, employeeLoginSchema, adminLoginSchema, refreshTokenSchema, changePinSchema } from '../validators/auth.validator';
import { otpLimiter, loginLimiter } from '../middlewares/rateLimit.middleware';

const router = Router();

router.post('/otp/request', otpLimiter, validate(requestOtpSchema), authController.requestOtp.bind(authController));
router.post('/otp/verify', validate(verifyOtpSchema), authController.verifyOtp.bind(authController));
router.post('/pin/set', authMiddleware, validate(setPinSchema), authController.setPin.bind(authController));
router.post('/login', loginLimiter, validate(loginSchema), authController.login.bind(authController));
router.post('/employee/login', loginLimiter, validate(employeeLoginSchema), authController.employeeLogin.bind(authController));
router.post('/employee/change-pin', authMiddleware, validate(changePinSchema), authController.changeEmployeePin.bind(authController));
router.post('/refresh', validate(refreshTokenSchema), authController.refresh.bind(authController));
router.post('/logout', authMiddleware, validate(refreshTokenSchema), authController.logout.bind(authController));
router.post('/pin/reset', otpLimiter, validate(requestOtpSchema), authController.resetPin.bind(authController));
router.post('/admin/login', loginLimiter, validate(adminLoginSchema), authController.adminLogin.bind(authController));

router.get('/users/me', authMiddleware, authController.getMe.bind(authController));
router.put('/users/me', authMiddleware, authController.updateProfile.bind(authController));

export default router;
