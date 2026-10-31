import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/appError';
import { UserRole } from '../models/User';

/**
 * Customer: Place order from cart
 * POST /api/v1/orders
 */
export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(AppError.unauthorized('Please log in to place an order'));
    }

    const { addressId, paymentMethod, couponCode } = req.body;
    const idempotencyKey =
      (req.headers['x-idempotency-key'] as string) || req.body.idempotencyKey;

    if (!addressId) {
      return next(AppError.badRequest('Delivery address is required'));
    }

    if (!paymentMethod || !['COD', 'ONLINE', 'PHONEPE', 'UPI'].includes(paymentMethod)) {
      return next(AppError.badRequest('Valid payment method (COD or ONLINE) is required'));
    }

    const result = await OrderService.createOrder({
      userId: req.user.id,
      addressId,
      paymentMethod,
      couponCode,
      idempotencyKey,
    });

    sendSuccess(
      res,
      result,
      result.order.paymentMethod === 'COD'
        ? 'Order placed successfully with Cash on Delivery!'
        : 'Order created! Please complete payment.',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Customer: Get customer's orders
 * GET /api/v1/orders
 */
export const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    const orders = await OrderService.getUserOrders(req.user.id);
    sendSuccess(res, { orders }, 'Orders retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Customer / Admin: Get order details by ID
 * GET /api/v1/orders/:id
 */
export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    const isAdmin = req.user.role === UserRole.ADMIN;
    const order = await OrderService.getOrderById(req.params.id, req.user.id, isAdmin);
    sendSuccess(res, { order }, 'Order details retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get all store orders
 * GET /api/v1/orders/admin
 */
export const getAdminOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, paymentStatus, search, page, limit } = req.query;
    const result = await OrderService.getAllOrders({
      status: status as string,
      paymentStatus: paymentStatus as string,
      search: search as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    sendSuccess(res, result, 'All orders retrieved for admin');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update order progression status
 * PATCH /api/v1/orders/admin/:id/status
 */
export const updateAdminOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    const { status, comment } = req.body;
    if (!status) {
      return next(AppError.badRequest('Status is required'));
    }

    const order = await OrderService.updateOrderStatus(
      req.params.id,
      status,
      req.user.id,
      comment
    );
    sendSuccess(res, { order }, `Order status updated to ${status}`);
  } catch (error) {
    next(error);
  }
};

/**
 * Admin / Staff: Collect COD payment
 * PATCH /api/v1/orders/admin/:id/collect-cod
 */
export const collectCodPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    const { notes } = req.body;
    const result = await OrderService.collectCodPayment(req.params.id, req.user.id, notes);
    sendSuccess(res, result, 'Cash on Delivery payment collected and recorded successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin / Staff: Assign delivery partner
 * PATCH /api/v1/orders/admin/:id/assign-partner
 */
export const assignDeliveryPartner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    const { deliveryPartnerId } = req.body;
    if (!deliveryPartnerId) {
      return next(AppError.badRequest('deliveryPartnerId is required'));
    }

    const order = await OrderService.assignDeliveryPartner(
      req.params.id,
      deliveryPartnerId,
      req.user.id
    );
    sendSuccess(res, { order }, 'Delivery partner assigned successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Admin / Staff: Refund order
 * PATCH /api/v1/orders/admin/:id/refund
 */
export const refundOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    const { reason } = req.body;
    const order = await OrderService.refundOrder(req.params.id, req.user.id, reason);
    sendSuccess(res, { order }, 'Order refunded successfully');
  } catch (error) {
    next(error);
  }
};
