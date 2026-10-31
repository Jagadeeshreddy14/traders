import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getCurrentUser,
} from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../validators/auth.validator';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { authLimiter } from '../middleware/rateLimiter';
import { UserRole } from '../models/User';
import { sendResponse } from '../utils/apiResponse';

const router = Router();

// Public auth routes (with rate limiting and zod validation)
router.post('/register', authLimiter, validateRequest(registerSchema), register);
router.post('/login', authLimiter, validateRequest(loginSchema), login);
router.post('/refresh', validateRequest(refreshTokenSchema), refresh);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);

// Role verification test endpoint for testing RBAC
router.get(
  '/admin-check',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.STAFF),
  (req, res) => {
    return sendResponse({
      res,
      message: 'Admin authorization verified successfully',
      data: { user: req.user?.toSafeJSON() },
    });
  }
);

export default router;
