import { Router } from 'express';
import {
  getServiceability,
  getDeliveryConfig,
  getAdminDeliveryConfig,
  updateAdminDeliveryConfig,
  addOrUpdatePincode,
  removePincode,
} from '../controllers/delivery.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { UserRole } from '../models/User';

const router = Router();

// Public routes
router.get('/serviceability', getServiceability);
router.get('/config', getDeliveryConfig);

// Admin routes
router.get('/admin/config', authenticate, authorize(UserRole.ADMIN), getAdminDeliveryConfig);
router.put('/admin/config', authenticate, authorize(UserRole.ADMIN), updateAdminDeliveryConfig);
router.post('/admin/pincodes', authenticate, authorize(UserRole.ADMIN), addOrUpdatePincode);
router.delete('/admin/pincodes/:pincode', authenticate, authorize(UserRole.ADMIN), removePincode);

export default router;
