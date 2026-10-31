import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/appError';

/**
 * Customer: Initiate PhonePe Payment
 * POST /api/v1/payments/phonepe/initiate
 */
export const initiatePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(AppError.unauthorized('Please log in to initiate payment'));
    }

    const { orderId, returnUrl } = req.body;
    if (!orderId) {
      return next(AppError.badRequest('orderId is required'));
    }

    const result = await PaymentService.initiatePhonePePayment({
      orderId,
      userId: req.user.id,
      returnUrl,
    });

    sendSuccess(res, result, 'PhonePe checkout initiated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PhonePe Webhook Callback (Server-to-Server)
 * POST /api/v1/payments/phonepe/webhook
 */
export const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const result = await PaymentService.handlePhonePeWebhook(authHeader, req.body);
    sendSuccess(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Customer: Check & Reconcile Payment Status
 * GET /api/v1/payments/:orderId/status
 */
export const checkPaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    const result = await PaymentService.verifyPaymentStatus(req.params.orderId, req.user.id);
    sendSuccess(res, result, 'Payment status verified');
  } catch (error) {
    next(error);
  }
};
