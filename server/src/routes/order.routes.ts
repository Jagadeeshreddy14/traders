import { Router } from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  getAdminOrders,
  updateAdminOrderStatus,
  collectCodPayment,
  assignDeliveryPartner,
  refundOrder,
} from '../controllers/order.controller';
import { getInvoiceData, getHtmlInvoice } from '../controllers/invoice.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { UserRole } from '../models/User';

const router = Router();

// Customer authenticated routes
router.post('/', authenticate, createOrder);
router.get('/', authenticate, getMyOrders);

// Admin routes (placed before :id to prevent collision)
router.get('/admin', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF), getAdminOrders);
router.patch('/admin/:id/status', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF), updateAdminOrderStatus);
router.patch('/admin/:id/collect-cod', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF), collectCodPayment);
router.patch('/admin/:id/assign-partner', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF), assignDeliveryPartner);
router.patch('/admin/:id/refund', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF), refundOrder);

// Order details and invoice (accessible by order owner or admin)
router.get('/:id', authenticate, getOrderById);
router.get('/:id/invoice', authenticate, getInvoiceData);
router.get('/:id/invoice/html', authenticate, getHtmlInvoice);

export default router;
