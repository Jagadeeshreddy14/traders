import { Router } from 'express';
import {
  initiatePayment,
  handleWebhook,
  checkPaymentStatus,
} from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// PhonePe Webhook callback (Server-to-Server, authenticated via PhonePe auth header / signature)
router.post('/phonepe/webhook', handleWebhook);

// Customer payment initiation and client verification
router.post('/phonepe/initiate', authenticate, initiatePayment);
router.get('/:orderId/status', authenticate, checkPaymentStatus);

export default router;
