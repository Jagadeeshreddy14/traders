import mongoose from 'mongoose';
import { Notification, NotificationType, INotificationDocument } from '../models/Notification';
import { logger } from '../utils/logger';

export class NotificationService {
  /**
   * Create and record a customer notification event
   */
  public static async emitNotification(params: {
    userId: string | mongoose.Types.ObjectId;
    orderId?: string | mongoose.Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, any>;
  }): Promise<INotificationDocument> {
    const { userId, orderId, type, title, message, metadata } = params;

    const notification = await Notification.create({
      user: userId,
      order: orderId,
      type,
      title,
      message,
      channel: 'IN_APP',
      metadata,
    });

    logger.info(`[Notification] ${type} sent to user ${userId}: "${title}"`);
    return notification;
  }

  /**
   * Helper for Order Created
   */
  public static async notifyOrderCreated(
    userId: string | mongoose.Types.ObjectId,
    orderId: string | mongoose.Types.ObjectId,
    orderNumber: string,
    amountRupees: string
  ) {
    return this.emitNotification({
      userId,
      orderId,
      type: NotificationType.ORDER_CREATED,
      title: `Order #${orderNumber} Initiated`,
      message: `Your grocery order #${orderNumber} for ₹${amountRupees} has been created and is awaiting payment.`,
    });
  }

  /**
   * Helper for Payment Success
   */
  public static async notifyPaymentSuccess(
    userId: string | mongoose.Types.ObjectId,
    orderId: string | mongoose.Types.ObjectId,
    orderNumber: string,
    amountRupees: string
  ) {
    return this.emitNotification({
      userId,
      orderId,
      type: NotificationType.PAYMENT_SUCCESSFUL,
      title: `Payment Received for #${orderNumber}`,
      message: `Payment of ₹${amountRupees} via PhonePe was successful! We are preparing your fresh grocery basket.`,
    });
  }

  /**
   * Helper for Payment Failed
   */
  public static async notifyPaymentFailed(
    userId: string | mongoose.Types.ObjectId,
    orderId: string | mongoose.Types.ObjectId,
    orderNumber: string,
    reason?: string
  ) {
    return this.emitNotification({
      userId,
      orderId,
      type: NotificationType.PAYMENT_FAILED,
      title: `Payment Failed for #${orderNumber}`,
      message: `Your payment could not be processed${reason ? `: ${reason}` : ''}. You can retry payment anytime.`,
    });
  }

  /**
   * Helper for COD Order Confirmed
   */
  public static async notifyCodConfirmed(
    userId: string | mongoose.Types.ObjectId,
    orderId: string | mongoose.Types.ObjectId,
    orderNumber: string,
    amountRupees: string
  ) {
    return this.emitNotification({
      userId,
      orderId,
      type: NotificationType.COD_ORDER_CONFIRMED,
      title: `Order #${orderNumber} Confirmed (Cash on Delivery)`,
      message: `Your COD order of ₹${amountRupees} is confirmed. Please keep exact cash or UPI ready at delivery.`,
    });
  }

  /**
   * Helper for Order Cancelled
   */
  public static async notifyOrderCancelled(
    userId: string | mongoose.Types.ObjectId,
    orderId: string | mongoose.Types.ObjectId,
    orderNumber: string,
    reason?: string
  ) {
    return this.emitNotification({
      userId,
      orderId,
      type: NotificationType.ORDER_CANCELLED,
      title: `Order #${orderNumber} Cancelled`,
      message: `Your order has been cancelled${reason ? `: ${reason}` : ''}.`,
    });
  }
}
