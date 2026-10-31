import { Router } from 'express';
import {
  getActiveCoupons,
  validateCoupon,
  getAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  toggleAdminCouponStatus,
  deleteAdminCoupon,
} from '../controllers/coupon.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { UserRole } from '../models/User';

const router = Router();

// Public / Customer routes
router.get('/active', getActiveCoupons);
router.post('/validate', validateCoupon);

// Admin routes
router.get('/admin', authenticate, authorize(UserRole.ADMIN), getAdminCoupons);
router.post('/admin', authenticate, authorize(UserRole.ADMIN), createAdminCoupon);
router.put('/admin/:id', authenticate, authorize(UserRole.ADMIN), updateAdminCoupon);
router.patch('/admin/:id/status', authenticate, authorize(UserRole.ADMIN), toggleAdminCouponStatus);
router.delete('/admin/:id', authenticate, authorize(UserRole.ADMIN), deleteAdminCoupon);

export default router;
