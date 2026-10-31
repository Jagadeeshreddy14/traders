import mongoose from 'mongoose';
import {
  Order,
  OrderStatus,
  PaymentStatus,
  Payment,
  PaymentProvider,
  PaymentTransactionStatus,
  Cart,
} from '../models';
import { PhonePeService } from './phonepe.service';
import { InventoryService } from './inventory.service';
import { CouponService } from './coupon.service';
import { NotificationService } from './notification.service';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

export class PaymentService {
  /**
   * Initiate PhonePe online payment session
   */
  public static async initiatePhonePePayment(params: {
    orderId: string;
    userId: string;
    returnUrl?: string;
  }): Promise<{
    success: boolean;
    redirectUrl: string;
    merchantTransactionId: string;
    orderId: string;
    orderNumber: string;
  }> {
    const { orderId, userId, returnUrl } = params;

    const order = await Order.findById(orderId);
    if (!order) {
      throw AppError.notFound('Order not found');
    }

    if (order.user.toString() !== userId.toString()) {
      throw AppError.forbidden('You are not authorized to initiate payment for this order');
    }

    if (order.paymentStatus === PaymentStatus.PAID || order.paymentStatus === PaymentStatus.SUCCESS) {
      throw AppError.badRequest('This order is already paid.');
    }

    // Check inventory reservation expiry
    if (
      order.inventoryReservationExpiresAt &&
      order.inventoryReservationExpiresAt < new Date() &&
      !order.inventoryDeducted
    ) {
      await InventoryService.releaseReservedStock(order);
      order.orderStatus = OrderStatus.PAYMENT_FAILED;
      order.statusHistory.push({
        status: OrderStatus.PAYMENT_FAILED,
        timestamp: new Date(),
        comment: 'Inventory reservation expired before payment initiation.',
      });
      await order.save();
      throw AppError.badRequest(
        'Payment window expired and items were returned to inventory. Please place a new order from your cart.'
      );
    }

    // Find or create Payment record
    let payment = await Payment.findOne({ order: order._id });
    if (!payment) {
      payment = new Payment({
        order: order._id,
        user: userId,
        amount: order.finalAmount,
        currency: 'INR',
        provider: PaymentProvider.PHONEPE,
        status: PaymentTransactionStatus.PENDING,
      });
    }

    // Generate unique merchantTransactionId (PTX_...)
    const merchantTransactionId = `PTX_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Initiate session with PhonePe service
    const initiateRes = await PhonePeService.initiatePayment({
      merchantOrderId: merchantTransactionId,
      amountPaise: order.finalAmount,
      redirectUrl: returnUrl,
      orderNumber: order.orderNumber,
      userPhone: order.deliveryAddress.recipientPhone,
      userName: order.deliveryAddress.recipientName,
    });

    // Update payment record with references
    payment.merchantTransactionId = merchantTransactionId;
    payment.paymentGatewayOrderId = initiateRes.phonepeOrderId;
    payment.provider = PaymentProvider.PHONEPE;
    payment.status = PaymentTransactionStatus.PENDING;
    payment.auditEvents.push({
      event: 'PHONEPE_CHECKOUT_INITIATED',
      status: 'PENDING',
      timestamp: new Date(),
      details: {
        merchantTransactionId,
        phonepeOrderId: initiateRes.phonepeOrderId,
        amount: order.finalAmount,
      },
    });

    await payment.save();

    logger.info('PhonePe payment initiated successfully', {
      orderId: order._id,
      merchantTransactionId,
    });

    return {
      success: true,
      redirectUrl: initiateRes.redirectUrl,
      merchantTransactionId,
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
    };
  }

  /**
   * Handle incoming PhonePe Webhook callback (Server-to-Server)
   */
  public static async handlePhonePeWebhook(
    authHeader?: string,
    webhookBody?: any
  ): Promise<{ success: boolean; message: string }> {
    // 1. Verify Webhook Authentication
    const isValidAuth = PhonePeService.verifyWebhookAuth(authHeader);
    if (!isValidAuth) {
      logger.warn('Rejected PhonePe webhook with invalid credentials', { authHeader });
      throw AppError.unauthorized('Invalid PhonePe webhook credentials or signature');
    }

    const payload = webhookBody?.payload || webhookBody?.data || webhookBody;
    const merchantOrderId =
      payload?.merchantOrderId ||
      payload?.merchantTransactionId ||
      webhookBody?.merchantTransactionId;

    if (!merchantOrderId) {
      throw AppError.badRequest('Missing merchantOrderId in webhook payload');
    }

    // 2. Locate Payment & Order
    const payment = await Payment.findOne({
      $or: [{ merchantTransactionId: merchantOrderId }, { _id: mongoose.isValidObjectId(merchantOrderId) ? merchantOrderId : null }],
    });

    if (!payment) {
      logger.warn('Webhook received for unknown merchant order ID', { merchantOrderId });
      throw AppError.notFound(`No transaction found for merchant order ID: ${merchantOrderId}`);
    }

    const order = await Order.findById(payment.order);
    if (!order) {
      throw AppError.notFound('Associated order not found');
    }

    // 3. Idempotency Check: Don't process twice if already success
    if (
      payment.status === PaymentTransactionStatus.SUCCESS ||
      payment.status === PaymentTransactionStatus.PAID
    ) {
      logger.info('Payment already marked SUCCESS, skipping duplicate webhook', {
        orderId: order._id,
        merchantOrderId,
      });
      return { success: true, message: 'Webhook already processed' };
    }

    // 4. Verify transaction status with PhonePe server-side
    const statusResult = await PhonePeService.checkOrderStatus(merchantOrderId);

    // 5. Amount mismatch validation
    if (statusResult.amount && statusResult.amount !== order.finalAmount) {
      logger.error('CRITICAL: Payment amount mismatch detected', {
        expected: order.finalAmount,
        received: statusResult.amount,
        merchantOrderId,
      });
      throw AppError.badRequest('Payment amount verification mismatch');
    }

    // 6. Handle Payment States
    if (statusResult.state === 'COMPLETED') {
      payment.status = PaymentTransactionStatus.SUCCESS;
      payment.phonepeTransactionId = statusResult.payReferenceId || statusResult.orderId;
      payment.paymentMethod = statusResult.paymentMode || 'ONLINE';
      payment.rawResponse = statusResult.rawResponse;
      payment.auditEvents.push({
        event: 'WEBHOOK_PAYMENT_SUCCESS',
        status: 'SUCCESS',
        timestamp: new Date(),
        details: {
          merchantOrderId,
          phonepeOrderId: statusResult.orderId,
          amount: statusResult.amount,
        },
      });
      await payment.save();

      // Update Order
      order.orderStatus = OrderStatus.CONFIRMED;
      order.paymentStatus = PaymentStatus.PAID;
      order.statusHistory.push({
        status: OrderStatus.CONFIRMED,
        timestamp: new Date(),
        comment: `Payment of ₹${(order.finalAmount / 100).toFixed(2)} verified via PhonePe webhook.`,
      });
      await order.save();

      // Finalize inventory deduction
      await InventoryService.finalizeStockDeduction(order);

      // Record coupon usage
      if (order.couponCode) {
        await CouponService.recordUsage(order.couponCode, order.user);
      }

      // Clear customer's cart
      await Cart.findOneAndUpdate({ user: order.user }, { items: [] });

      // Send notification
      await NotificationService.notifyPaymentSuccess(
        order.user,
        order._id,
        order.orderNumber,
        (order.finalAmount / 100).toFixed(2)
      );

      logger.info('PhonePe payment successfully confirmed via webhook', {
        orderId: order._id,
        orderNumber: order.orderNumber,
      });
      return { success: true, message: 'Payment verified and order confirmed' };
    } else if (statusResult.state === 'FAILED') {
      payment.status = PaymentTransactionStatus.FAILED;
      payment.rawResponse = statusResult.rawResponse;
      payment.auditEvents.push({
        event: 'WEBHOOK_PAYMENT_FAILED',
        status: 'FAILED',
        timestamp: new Date(),
        details: { merchantOrderId, state: statusResult.state },
      });
      await payment.save();

      order.orderStatus = OrderStatus.PAYMENT_FAILED;
      order.paymentStatus = PaymentStatus.FAILED;
      order.statusHistory.push({
        status: OrderStatus.PAYMENT_FAILED,
        timestamp: new Date(),
        comment: 'PhonePe reported payment failed.',
      });
      await order.save();

      // Release reserved inventory
      await InventoryService.releaseReservedStock(order);

      // Send notification
      await NotificationService.notifyPaymentFailed(
        order.user,
        order._id,
        order.orderNumber,
        'Payment was declined by bank/gateway'
      );

      return { success: true, message: 'Payment failed, inventory released' };
    }

    return { success: true, message: 'Payment pending confirmation' };
  }

  /**
   * Check & Reconcile Payment Status (Client polling / redirect verification)
   */
  public static async verifyPaymentStatus(
    orderId: string,
    userId: string
  ): Promise<{
    order: any;
    payment: any;
  }> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw AppError.notFound('Order not found');
    }

    if (order.user.toString() !== userId.toString()) {
      throw AppError.forbidden('You are not authorized to check this order status');
    }

    const payment = await Payment.findOne({ order: order._id });
    if (!payment) {
      throw AppError.notFound('Payment record not found for order');
    }

    // If already verified SUCCESS, return immediately
    if (payment.status === PaymentTransactionStatus.SUCCESS || payment.status === PaymentTransactionStatus.PAID) {
      return { order, payment };
    }

    // If online payment with merchantTransactionId, check PhonePe server
    if (payment.provider === PaymentProvider.PHONEPE && payment.merchantTransactionId) {
      const statusResult = await PhonePeService.checkOrderStatus(payment.merchantTransactionId);

      if (statusResult.state === 'COMPLETED') {
        payment.status = PaymentTransactionStatus.SUCCESS;
        payment.phonepeTransactionId = statusResult.payReferenceId || statusResult.orderId;
        payment.paymentMethod = statusResult.paymentMode || 'ONLINE';
        payment.rawResponse = statusResult.rawResponse;
        payment.auditEvents.push({
          event: 'CLIENT_VERIFY_PAYMENT_SUCCESS',
          status: 'SUCCESS',
          timestamp: new Date(),
        });
        await payment.save();

        order.orderStatus = OrderStatus.CONFIRMED;
        order.paymentStatus = PaymentStatus.PAID;
        order.statusHistory.push({
          status: OrderStatus.CONFIRMED,
          timestamp: new Date(),
          comment: 'Payment verified via server-side status check.',
        });
        await order.save();

        await InventoryService.finalizeStockDeduction(order);

        if (order.couponCode) {
          await CouponService.recordUsage(order.couponCode, order.user);
        }

        await Cart.findOneAndUpdate({ user: order.user }, { items: [] });

        await NotificationService.notifyPaymentSuccess(
          order.user,
          order._id,
          order.orderNumber,
          (order.finalAmount / 100).toFixed(2)
        );
      } else if (statusResult.state === 'FAILED') {
        payment.status = PaymentTransactionStatus.FAILED;
        payment.auditEvents.push({
          event: 'CLIENT_VERIFY_PAYMENT_FAILED',
          status: 'FAILED',
          timestamp: new Date(),
        });
        await payment.save();

        order.orderStatus = OrderStatus.PAYMENT_FAILED;
        order.paymentStatus = PaymentStatus.FAILED;
        await order.save();

        await InventoryService.releaseReservedStock(order);

        await NotificationService.notifyPaymentFailed(
          order.user,
          order._id,
          order.orderNumber,
          'Payment unsuccessful'
        );
      }
    }

    return { order, payment };
  }
}
