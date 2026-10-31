import mongoose from 'mongoose';
import {
  Order,
  IOrderDocument,
  OrderStatus,
  PaymentStatus,
  Payment,
  PaymentProvider,
  PaymentTransactionStatus,
  Address,
  Cart,
  Product,
  DeliveryConfig,
} from '../models';
import { DeliveryService } from './delivery.service';
import { CouponService } from './coupon.service';
import { InventoryService } from './inventory.service';
import { NotificationService } from './notification.service';
import { env } from '../config/env';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

export interface ICreateOrderInput {
  userId: string;
  addressId: string;
  paymentMethod: 'COD' | 'ONLINE' | 'PHONEPE' | 'UPI';
  couponCode?: string;
  idempotencyKey?: string;
}

export class OrderService {
  /**
   * Create a new grocery delivery order
   */
  public static async createOrder(input: ICreateOrderInput): Promise<{
    order: IOrderDocument;
    payment: any;
  }> {
    const { userId, addressId, paymentMethod, couponCode, idempotencyKey } = input;

    // 1. Idempotency Check
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({
        user: userId,
        idempotencyKey,
      });
      if (existingOrder) {
        const existingPayment = await Payment.findOne({ order: existingOrder._id });
        logger.info('Returning existing order from idempotency key', {
          orderId: existingOrder._id,
          idempotencyKey,
        });
        return { order: existingOrder, payment: existingPayment };
      }
    }

    // 2. Fetch Customer Cart
    const cart = await Cart.findOne({ user: userId });
    if (!cart || !cart.items || cart.items.length === 0) {
      throw AppError.badRequest('Shopping cart is empty. Please add items before placing order.');
    }

    // 3. Verify Delivery Address & Ownership
    const address = await Address.findById(addressId);
    if (!address) {
      throw AppError.notFound('Selected delivery address not found');
    }
    if (address.user.toString() !== userId.toString()) {
      throw AppError.forbidden('You do not have permission to use this address');
    }

    // 4. Validate Delivery PIN Serviceability
    const postalCode = address.postalCode;
    const serviceability = await DeliveryService.checkServiceability(postalCode);
    if (!serviceability.serviceable) {
      throw AppError.badRequest(
        `PIN Code ${postalCode} is currently outside our delivery service area.`
      );
    }

    // 5. Fetch Fresh Product Records and Recalculate Subtotal (Never trust client prices)
    const productIds = cart.items.map((i) => i.product);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const orderItems: Array<{
      product: mongoose.Types.ObjectId;
      name: string;
      unit: string;
      quantity: number;
      unitPrice: number;
      totalUnitPrice: number;
      image?: string;
    }> = [];

    let subtotalPaise = 0;

    for (const cartItem of cart.items) {
      const product = productMap.get(cartItem.product.toString());
      if (!product) {
        throw AppError.badRequest('One or more products in your cart are no longer available.');
      }

      if (!product.isAvailable || product.stockQuantity <= 0) {
        throw AppError.badRequest(
          `Product "${product.name}" is currently out of stock. Please remove it from your cart.`
        );
      }

      if (product.stockQuantity < cartItem.quantity) {
        throw AppError.badRequest(
          `Only ${product.stockQuantity} units available for "${product.name}". Please reduce quantity.`
        );
      }

      // Convert product price to integer paise
      const unitPricePaise = Math.round(
        (product.discountedPrice !== undefined && product.discountedPrice !== null
          ? product.discountedPrice
          : product.price) * 100
      );

      const totalItemPaise = unitPricePaise * cartItem.quantity;
      subtotalPaise += totalItemPaise;

      orderItems.push({
        product: product._id,
        name: product.name,
        unit: product.unit,
        quantity: cartItem.quantity,
        unitPrice: unitPricePaise,
        totalUnitPrice: totalItemPaise,
        image: product.images?.[0] || '',
      });
    }

    // 6. Fetch Delivery Configurations
    const deliveryConfig = await DeliveryService.getConfig();
    if (subtotalPaise < deliveryConfig.minOrderAmount) {
      throw AppError.badRequest(
        `Minimum order amount is ₹${(deliveryConfig.minOrderAmount / 100).toFixed(0)}. Your items total is ₹${(subtotalPaise / 100).toFixed(2)}.`
      );
    }

    // Calculate delivery charges & packaging fee
    const deliveryFeePaise =
      subtotalPaise >= deliveryConfig.freeDeliveryThreshold ? 0 : deliveryConfig.deliveryCharge;
    const packagingFeePaise = deliveryConfig.packagingCharge || 0;

    // 7. Validate Coupon
    let couponDiscountPaise = 0;
    let validatedCouponCode: string | undefined = undefined;

    if (couponCode) {
      const couponResult = await CouponService.validateCoupon(couponCode, subtotalPaise, userId);
      if (couponResult.valid) {
        couponDiscountPaise = couponResult.discountPaise;
        validatedCouponCode = couponResult.coupon?.code;
      } else {
        throw AppError.badRequest(couponResult.message);
      }
    }

    // 8. Calculate Final Payable Amount in integer paise
    const finalAmountPaise = Math.max(
      0,
      subtotalPaise - couponDiscountPaise + deliveryFeePaise + packagingFeePaise
    );

    // 9. COD Rules Validation
    const isCod = paymentMethod === 'COD';
    if (isCod) {
      // Optional check for max COD limit (e.g. ₹5,000)
      const MAX_COD_PAISE = 500000;
      if (finalAmountPaise > MAX_COD_PAISE) {
        throw AppError.badRequest(
          `Cash on Delivery is limited to orders up to ₹${MAX_COD_PAISE / 100}. Please choose online payment.`
        );
      }
    }

    // 10. Generate Identifiers
    const now = new Date();
    const datePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderNumber = `PT-${datePrefix}-${randSuffix}`;
    const invoiceNumber = `INV-${datePrefix.substring(0, 6)}-${randSuffix}`;

    // Delivery address snapshot
    const streetAddress = `${address.houseNo ? address.houseNo + ', ' : ''}${address.street ? address.street + ', ' : ''}${address.area || address.streetAddress || ''}`;

    // 11. Create Order Document
    const reservationExpiry = new Date(
      Date.now() + env.INVENTORY_RESERVATION_EXPIRY_MINUTES * 60 * 1000
    );

    const initialOrderStatus = isCod ? OrderStatus.CONFIRMED : OrderStatus.PAYMENT_PENDING;

    const order = new Order({
      orderNumber,
      invoiceNumber,
      user: userId,
      items: orderItems,
      deliveryAddress: {
        label: address.label || 'HOME',
        recipientName: address.recipientName,
        recipientPhone: address.recipientPhone,
        streetAddress: streetAddress.trim() || 'Address details',
        landmark: address.landmark,
        city: address.city,
        state: address.state,
        postalCode: postalCode,
      },
      orderStatus: initialOrderStatus,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: isCod ? 'COD' : 'ONLINE',
      totalAmount: subtotalPaise,
      discountAmount: couponDiscountPaise,
      deliveryFee: deliveryFeePaise,
      packagingFee: packagingFeePaise,
      finalAmount: finalAmountPaise,
      couponCode: validatedCouponCode,
      idempotencyKey,
      inventoryReservationExpiresAt: isCod ? undefined : reservationExpiry,
      inventoryDeducted: false,
      statusHistory: [
        {
          status: initialOrderStatus,
          timestamp: new Date(),
          comment: isCod
            ? 'Order confirmed with Cash on Delivery.'
            : 'Order initiated, awaiting online payment confirmation.',
        },
      ],
    });

    await order.save();

    // 12. Create Payment Record
    const payment = await Payment.create({
      order: order._id,
      user: userId,
      amount: finalAmountPaise,
      currency: 'INR',
      provider: isCod ? PaymentProvider.CASH_ON_DELIVERY : PaymentProvider.PHONEPE,
      status: PaymentTransactionStatus.PENDING,
      idempotencyKey,
      auditEvents: [
        {
          event: isCod ? 'COD_ORDER_PLACED' : 'PAYMENT_PENDING_INITIATION',
          status: 'PENDING',
          timestamp: new Date(),
          details: { orderNumber, amount: finalAmountPaise },
        },
      ],
    });

    // 13. Inventory & Cart Actions
    if (isCod) {
      // For COD: atomically deduct stock immediately and clear cart
      await InventoryService.deductStockForCodOrder(order);

      if (validatedCouponCode) {
        await CouponService.recordUsage(validatedCouponCode, userId);
      }

      // Clear customer's cart
      cart.items = [];
      await cart.save();

      // Emit Notification
      await NotificationService.notifyCodConfirmed(
        userId,
        order._id,
        orderNumber,
        (finalAmountPaise / 100).toFixed(2)
      );
    } else {
      // For Online payment: atomically reserve stock
      await InventoryService.reserveStockForOrder(order);

      // Emit Notification
      await NotificationService.notifyOrderCreated(
        userId,
        order._id,
        orderNumber,
        (finalAmountPaise / 100).toFixed(2)
      );
    }

    return { order, payment };
  }

  /**
   * Retrieve single order by ID with ownership check
   */
  public static async getOrderById(
    orderId: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<IOrderDocument> {
    const order = await Order.findById(orderId).populate('deliveryPartner');
    if (!order) {
      throw AppError.notFound('Order not found');
    }

    if (!isAdmin && order.user.toString() !== userId.toString()) {
      throw AppError.forbidden('You are not authorized to view this order');
    }

    return order;
  }

  /**
   * List customer's orders
   */
  public static async getUserOrders(userId: string): Promise<IOrderDocument[]> {
    return Order.find({ user: userId }).sort({ createdAt: -1 });
  }

  /**
   * Admin: List all orders with filters
   */
  public static async getAllOrders(query: {
    status?: string;
    paymentStatus?: string;
    search?: string;
    limit?: number;
    page?: number;
  }): Promise<{ orders: IOrderDocument[]; total: number }> {
    const filter: Record<string, any> = {};

    if (query.status && query.status !== 'ALL') {
      filter.orderStatus = query.status;
    }

    if (query.paymentStatus && query.paymentStatus !== 'ALL') {
      filter.paymentStatus = query.paymentStatus;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [
        { orderNumber: searchRegex },
        { invoiceNumber: searchRegex },
        { 'deliveryAddress.recipientName': searchRegex },
        { 'deliveryAddress.recipientPhone': searchRegex },
      ];
    }

    const limit = query.limit || 50;
    const page = query.page || 1;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(filter),
    ]);

    return { orders, total };
  }

  /**
   * Admin: Update order progression status
   */
  public static async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    adminUserId: string,
    comment?: string
  ): Promise<IOrderDocument> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw AppError.notFound('Order not found');
    }

    const previousStatus = order.orderStatus;
    order.orderStatus = newStatus;

    order.statusHistory.push({
      status: newStatus,
      timestamp: new Date(),
      comment: comment || `Status updated from ${previousStatus} to ${newStatus}`,
      updatedBy: new mongoose.Types.ObjectId(adminUserId),
    });

    // Handle cancellation: release inventory if applicable
    if (newStatus === OrderStatus.CANCELLED && previousStatus !== OrderStatus.CANCELLED) {
      await InventoryService.releaseReservedStock(order);
      await NotificationService.notifyOrderCancelled(
        order.user,
        order._id,
        order.orderNumber,
        comment
      );
    }

    if (newStatus === OrderStatus.DELIVERED) {
      order.deliveredAt = new Date();
    }

    await order.save();
    return order;
  }

  /**
   * Admin / Staff: Collect Cash on Delivery Payment
   */
  public static async collectCodPayment(
    orderId: string,
    adminUserId: string,
    notes?: string
  ): Promise<{ order: IOrderDocument; payment: any }> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw AppError.notFound('Order not found');
    }

    if (order.paymentMethod !== 'COD') {
      throw AppError.badRequest('This order is not a Cash on Delivery order.');
    }

    if (order.paymentStatus === PaymentStatus.PAID || order.paymentStatus === PaymentStatus.SUCCESS) {
      throw AppError.badRequest('COD payment has already been collected for this order.');
    }

    const now = new Date();
    order.paymentStatus = PaymentStatus.PAID;
    order.codCollectionInfo = {
      collectedBy: new mongoose.Types.ObjectId(adminUserId),
      collectedAt: now,
      notes: notes || 'Cash received by delivery staff/admin',
    };

    order.statusHistory.push({
      status: order.orderStatus,
      timestamp: now,
      comment: `COD payment of ₹${(order.finalAmount / 100).toFixed(2)} collected. Notes: ${notes || 'None'}`,
      updatedBy: new mongoose.Types.ObjectId(adminUserId),
    });

    await order.save();

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { order: order._id },
      {
        status: PaymentTransactionStatus.SUCCESS,
        codCollectedBy: new mongoose.Types.ObjectId(adminUserId),
        codCollectedAt: now,
        codCollectionNotes: notes,
        $push: {
          auditEvents: {
            event: 'COD_PAYMENT_COLLECTED',
            status: 'SUCCESS',
            timestamp: now,
            details: { collectedBy: adminUserId, notes },
          },
        },
      },
      { new: true }
    );

    await NotificationService.notifyPaymentSuccess(
      order.user,
      order._id,
      order.orderNumber,
      (order.finalAmount / 100).toFixed(2)
    );

    return { order, payment };
  }

  /**
   * Admin / Staff: Assign delivery partner to order
   */
  public static async assignDeliveryPartner(
    orderId: string,
    partnerId: string,
    adminUserId: string
  ): Promise<IOrderDocument> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw AppError.notFound('Order not found');
    }

    const partner = await mongoose.model('DeliveryPartner').findById(partnerId);
    if (!partner) {
      throw AppError.notFound('Delivery partner not found');
    }

    order.deliveryPartner = new mongoose.Types.ObjectId(partnerId);
    order.statusHistory.push({
      status: order.orderStatus,
      timestamp: new Date(),
      comment: `Assigned to delivery partner ${partner.name}`,
      updatedBy: new mongoose.Types.ObjectId(adminUserId),
    });

    await order.save();
    return order;
  }

  /**
   * Admin / Staff: Process refund for cancelled or returned order
   */
  public static async refundOrder(
    orderId: string,
    adminUserId: string,
    reason?: string
  ): Promise<IOrderDocument> {
    const order = await Order.findById(orderId);
    if (!order) {
      throw AppError.notFound('Order not found');
    }

    if (order.paymentStatus === PaymentStatus.REFUNDED) {
      throw AppError.badRequest('This order has already been marked as REFUNDED.');
    }

    order.orderStatus = OrderStatus.REFUNDED;
    order.paymentStatus = PaymentStatus.REFUNDED;
    order.statusHistory.push({
      status: OrderStatus.REFUNDED,
      timestamp: new Date(),
      comment: `Refund processed: ${reason || 'Customer refund granted'}`,
      updatedBy: new mongoose.Types.ObjectId(adminUserId),
    });

    await order.save();

    await Payment.findOneAndUpdate(
      { order: order._id },
      {
        status: PaymentTransactionStatus.REFUNDED,
        $push: {
          auditEvents: {
            event: 'PAYMENT_REFUNDED',
            status: 'REFUNDED',
            timestamp: new Date(),
            details: { adminUserId, reason },
          },
        },
      }
    );

    return order;
  }
}
