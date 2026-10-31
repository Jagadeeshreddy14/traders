import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { Category } from '../src/models/Category';
import { Product } from '../src/models/Product';
import { DeliveryConfig } from '../src/models/DeliveryConfig';
import { Cart } from '../src/models/Cart';
import { Address } from '../src/models/Address';
import { Order, OrderStatus, PaymentStatus } from '../src/models/Order';
import { Payment, PaymentTransactionStatus } from '../src/models/Payment';
import { User, UserRole } from '../src/models/User';
import { AuthService } from '../src/services/auth.service';
import { PhonePeService } from '../src/services/phonepe.service';
import { env } from '../src/config/env';

let mongoServer: MongoMemoryServer;

describe('Phase 4: PhonePe Payment Gateway and Order Placement API', () => {
  let customerToken: string;
  let otherCustomerToken: string;
  let adminToken: string;
  let customerAddressId: string;
  let otherCustomerAddressId: string;
  let testProductId: string;
  let limitedStockProductId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDatabase(uri);

    // 1. Create DeliveryConfig
    await DeliveryConfig.create({
      deliveryCharge: 4000, // ₹40
      freeDeliveryThreshold: 49900, // ₹499
      packagingCharge: 1500, // ₹15
      minOrderAmount: 19900, // ₹199
      defaultDeliveryWindow: '30-45 mins',
      supportedPincodes: [
        { pincode: '500001', areaName: 'City Center', deliveryWindow: '25-40 mins', isServiceable: true },
      ],
    });

    // 2. Create Category and Products
    const cat = await Category.create({
      name: 'Fresh Groceries',
      slug: 'fresh-groceries',
    });

    const product1 = await Product.create({
      name: 'Aashirvaad Superior MP Sharbati Atta',
      slug: 'aashirvaad-atta-5kg',
      category: cat._id,
      price: 320,
      discountedPrice: 280, // ₹280
      unit: '5 kg',
      stockQuantity: 20,
      isAvailable: true,
    });
    testProductId = product1._id.toString();

    const product2 = await Product.create({
      name: 'Saffola Gold Pro Healthy Lifestyle Oil',
      slug: 'saffola-gold-1l',
      category: cat._id,
      price: 190,
      discountedPrice: 160, // ₹160
      unit: '1 L',
      stockQuantity: 2, // only 2 units for concurrent tests
      isAvailable: true,
    });
    limitedStockProductId = product2._id.toString();

    // 3. Register Customer A
    const regRes1 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Jagadeesh Reddy',
        email: 'jagadeesh.phase4@example.com',
        password: 'Password@123',
        phone: '+919876543211',
      });
    customerToken = regRes1.body.data.tokens.accessToken;

    // 4. Register Customer B
    const regRes2 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Rahul Sharma',
        email: 'rahul.phase4@example.com',
        password: 'Password@123',
        phone: '+919876543212',
      });
    otherCustomerToken = regRes2.body.data.tokens.accessToken;

    // 5. Provision Admin User
    const adminPasswordHash = await AuthService.hashPassword('Admin@SecurePassword123!');
    const adminUser = new User({
      name: 'Store Administrator',
      email: 'admin.phase4@paventraders.com',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
      isVerified: true,
    });
    const tokens = AuthService.generateTokens(adminUser);
    await adminUser.save();
    adminToken = tokens.accessToken;

    // 6. Create Address for Customer A
    const addrRes1 = await request(app)
      .post('/api/v1/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        fullName: 'Jagadeesh Reddy',
        phone: '9876543211',
        houseNo: 'Flat 402, Sai Towers',
        street: 'Main Road',
        area: 'Abids',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500001',
        type: 'HOME',
      });
    customerAddressId =
      addrRes1.body.data.address?.id ||
      addrRes1.body.data.address?._id ||
      addrRes1.body.data.id;

    // 7. Create Address for Customer B
    const addrRes2 = await request(app)
      .post('/api/v1/addresses')
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .send({
        fullName: 'Rahul Sharma',
        phone: '9876543212',
        houseNo: 'House 12',
        street: 'Station Road',
        area: 'City Center',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500001',
        type: 'WORK',
      });
    otherCustomerAddressId =
      addrRes2.body.data.address?.id ||
      addrRes2.body.data.address?._id ||
      addrRes2.body.data.id;
  });

  afterAll(async () => {
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // Test 1: Order Creation for Online Payment
  let onlineOrderId: string;
  let initialStock: number;

  it('1. should create an online order and reserve inventory (PAYMENT_PENDING)', async () => {
    // Add product to cart (1 unit of ₹280)
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: testProductId, quantity: 1 });

    const prodBefore = await Product.findById(testProductId);
    initialStock = prodBefore!.stockQuantity;

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        addressId: customerAddressId,
        paymentMethod: 'ONLINE',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.order.orderStatus).toBe(OrderStatus.PAYMENT_PENDING);
    expect(res.body.data.order.paymentStatus).toBe(PaymentStatus.PENDING);
    expect(res.body.data.order.finalAmount).toBeGreaterThan(0);
    onlineOrderId = res.body.data.order.id || res.body.data.order._id;

    // Verify inventory reservation: stock decreased by 1
    const prodAfter = await Product.findById(testProductId);
    expect(prodAfter!.stockQuantity).toBe(initialStock - 1);
  });

  // Test 2: Successful Payment Initiation & Webhook Confirmation
  let merchantTxId: string;
  it('2. should initiate PhonePe payment and handle successful payment completion', async () => {
    const initRes = await request(app)
      .post('/api/v1/payments/phonepe/initiate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId: onlineOrderId,
      });

    expect(initRes.status).toBe(200);
    expect(initRes.body.data.redirectUrl).toBeDefined();
    expect(initRes.body.data.merchantTransactionId).toBeDefined();
    merchantTxId = initRes.body.data.merchantTransactionId;

    const currentOrder = await Order.findById(onlineOrderId);

    // Simulate PhonePe Webhook callback
    const webhookRes = await request(app)
      .post('/api/v1/payments/phonepe/webhook')
      .set(
        'Authorization',
        `Basic ${Buffer.from(`${env.PHONEPE_WEBHOOK_USERNAME}:${env.PHONEPE_WEBHOOK_PASSWORD}`).toString('base64')}`
      )
      .send({
        merchantOrderId: merchantTxId,
        state: 'COMPLETED',
        amount: currentOrder!.finalAmount,
      });

    expect(webhookRes.status).toBe(200);

    // Verify Order is now CONFIRMED and payment is PAID
    const order = await Order.findById(onlineOrderId);
    expect(order!.orderStatus).toBe(OrderStatus.CONFIRMED);
    expect(order!.paymentStatus).toBe(PaymentStatus.PAID);
    expect(order!.inventoryDeducted).toBe(true);

    // Verify cart was cleared
    const cart = await Cart.findOne({ user: order!.user });
    expect(cart!.items.length).toBe(0);
  });

  // Test 3: Duplicate Webhook Handling (Idempotency)
  it('3. should handle duplicate webhooks idempotently without errors or double inventory deduction', async () => {
    const prodBefore = await Product.findById(testProductId);

    const dupRes = await request(app)
      .post('/api/v1/payments/phonepe/webhook')
      .set(
        'Authorization',
        `Basic ${Buffer.from(`${env.PHONEPE_WEBHOOK_USERNAME}:${env.PHONEPE_WEBHOOK_PASSWORD}`).toString('base64')}`
      )
      .send({
        merchantOrderId: merchantTxId,
        state: 'COMPLETED',
      });

    expect(dupRes.status).toBe(200);
    expect(dupRes.body.data.message).toMatch(/already processed/i);

    // Stock should not change again
    const prodAfter = await Product.findById(testProductId);
    expect(prodAfter!.stockQuantity).toBe(prodBefore!.stockQuantity);
  });

  // Test 4: Failed Payment and Stock Release
  it('4. should mark order PAYMENT_FAILED and release reserved inventory on payment failure', async () => {
    // Clear cart and add 1 item
    await request(app)
      .delete('/api/v1/cart')
      .set('Authorization', `Bearer ${customerToken}`);

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: testProductId, quantity: 1 });

    const prodBefore = await Product.findById(testProductId);
    const stockBefore = prodBefore!.stockQuantity;

    // Create order
    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        addressId: customerAddressId,
        paymentMethod: 'ONLINE',
      });

    const failedOrderId = orderRes.body.data.order.id || orderRes.body.data.order._id;
    // Stock reserved
    const stockReserved = await Product.findById(testProductId);
    expect(stockReserved!.stockQuantity).toBe(stockBefore - 1);

    // Initiate payment
    const initRes = await request(app)
      .post('/api/v1/payments/phonepe/initiate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ orderId: failedOrderId });

    const txId = initRes.body.data.merchantTransactionId;

    // Mock PhonePe returning FAILED status
    const origCheck = PhonePeService.checkOrderStatus;
    PhonePeService.checkOrderStatus = async () => ({
      orderId: 'OMO_FAIL',
      merchantOrderId: txId,
      state: 'FAILED',
      amount: orderRes.body.data.order.finalAmount,
    });

    // Send Webhook with failure
    await request(app)
      .post('/api/v1/payments/phonepe/webhook')
      .set(
        'Authorization',
        `Basic ${Buffer.from(`${env.PHONEPE_WEBHOOK_USERNAME}:${env.PHONEPE_WEBHOOK_PASSWORD}`).toString('base64')}`
      )
      .send({
        merchantOrderId: txId,
        state: 'FAILED',
      });

    // Restore PhonePe check
    PhonePeService.checkOrderStatus = origCheck;

    // Verify order is PAYMENT_FAILED and reserved stock was released back
    const order = await Order.findById(failedOrderId);
    expect(order!.orderStatus).toBe(OrderStatus.PAYMENT_FAILED);

    const stockRestored = await Product.findById(testProductId);
    expect(stockRestored!.stockQuantity).toBe(stockBefore);
  });

  // Test 5: Invalid Webhook Authentication
  it('5. should reject webhook requests with invalid or missing credentials', async () => {
    const res = await request(app)
      .post('/api/v1/payments/phonepe/webhook')
      .set('Authorization', 'Basic invalid_credentials_xyz')
      .send({
        merchantOrderId: 'SOME_ORDER',
        state: 'COMPLETED',
      });

    expect(res.status).toBe(401);
  });

  // Test 6: Unknown Merchant Order ID
  it('6. should reject webhook for unknown merchant order ID with 404', async () => {
    const res = await request(app)
      .post('/api/v1/payments/phonepe/webhook')
      .set(
        'Authorization',
        `Basic ${Buffer.from(`${env.PHONEPE_WEBHOOK_USERNAME}:${env.PHONEPE_WEBHOOK_PASSWORD}`).toString('base64')}`
      )
      .send({
        merchantOrderId: 'PTX_NON_EXISTENT_ID_99999',
        state: 'COMPLETED',
      });

    expect(res.status).toBe(404);
  });

  // Test 7: Customer Accessing Another Customer's Order
  it('7. should prevent customer A from accessing or checking status of customer B order (403)', async () => {
    const res = await request(app)
      .get(`/api/v1/orders/${onlineOrderId}`)
      .set('Authorization', `Bearer ${otherCustomerToken}`);

    expect(res.status).toBe(403);
  });

  // Test 8: Duplicate Order Submission Idempotency
  it('8. should prevent duplicate order creation using idempotency key', async () => {
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .send({ productId: testProductId, quantity: 1 });

    const key = 'IDEMP_KEY_12345';

    const order1 = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .set('x-idempotency-key', key)
      .send({
        addressId: otherCustomerAddressId,
        paymentMethod: 'ONLINE',
      });

    expect(order1.status).toBe(201);

    // Second request with same idempotency key
    const order2 = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .set('x-idempotency-key', key)
      .send({
        addressId: otherCustomerAddressId,
        paymentMethod: 'ONLINE',
      });

    expect(order2.status).toBe(201);
    expect(order2.body.data.order._id).toBe(order1.body.data.order._id);
  });

  // Test 9: Concurrent Purchase Attempts Above Available Stock
  it('9. should reject order placement when requested quantity exceeds available stock', async () => {
    // limitedStockProductId has only 2 units in stock
    // Set cart quantity to 5
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: limitedStockProductId, quantity: 2 });

    // Manually force product stock to 1 to simulate concurrent race
    await Product.findByIdAndUpdate(limitedStockProductId, { stockQuantity: 1 });

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        addressId: customerAddressId,
        paymentMethod: 'ONLINE',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/only 1 units available/i);
  });

  // Test 10: Cash on Delivery (COD) Order
  let codOrderId: string;
  it('10. should place COD order, deduct stock immediately, and set payment status PENDING', async () => {
    // Reset stock and clear cart before adding item
    await Product.findByIdAndUpdate(testProductId, { stockQuantity: 10 });

    await request(app)
      .delete('/api/v1/cart')
      .set('Authorization', `Bearer ${customerToken}`);

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: testProductId, quantity: 1 });

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        addressId: customerAddressId,
        paymentMethod: 'COD',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.order.paymentMethod).toBe('COD');
    expect(res.body.data.order.orderStatus).toBe(OrderStatus.CONFIRMED);
    expect(res.body.data.order.paymentStatus).toBe(PaymentStatus.PENDING);
    codOrderId = res.body.data.order.id || res.body.data.order._id;

    // Stock should be deducted immediately
    const prod = await Product.findById(testProductId);
    expect(prod!.stockQuantity).toBe(9);
  });

  // Test 11: COD Collection by Authorized Admin/Staff
  it('11. should allow authorized admin to collect COD payment and update status to PAID', async () => {
    const res = await request(app)
      .patch(`/api/v1/orders/admin/${codOrderId}/collect-cod`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        notes: 'Customer paid exact cash ₹335 at delivery',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.order.paymentStatus).toBe(PaymentStatus.PAID);

    const payment = await Payment.findOne({ order: codOrderId });
    expect(payment!.status).toBe(PaymentTransactionStatus.SUCCESS);
    expect(payment!.codCollectionNotes).toContain('Customer paid exact cash');
  });

  // Test 12: Invoice Data Generation
  it('12. should generate structured invoice data with store contact details, items, and totals', async () => {
    const res = await request(app)
      .get(`/api/v1/orders/${codOrderId}/invoice`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    const invoice = res.body.data.invoice;
    expect(invoice.invoiceNumber).toMatch(/^INV-/);
    expect(invoice.store.name).toBe(env.STORE_NAME);
    expect(invoice.items.length).toBeGreaterThan(0);
    expect(invoice.pricing.totalAmountRupees).toBeDefined();
    expect(invoice.payment.method).toBe('COD');
  });

  // Test 13: Printable HTML Invoice Endpoint
  it('13. should return printable HTML document from /api/v1/orders/:id/invoice/html', async () => {
    const res = await request(app)
      .get(`/api/v1/orders/${codOrderId}/invoice/html`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('TAX INVOICE');
    expect(res.text).toContain(env.STORE_NAME);
  });

  // Test 14: Payment Retry on Failed Order
  it('14. should allow customer to re-initiate payment on failed/pending order', async () => {
    // Clear cart and create new order
    await request(app)
      .delete('/api/v1/cart')
      .set('Authorization', `Bearer ${customerToken}`);

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: testProductId, quantity: 1 });

    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        addressId: customerAddressId,
        paymentMethod: 'ONLINE',
      });

    const retryOrderId = orderRes.body.data.order.id || orderRes.body.data.order._id;

    // First attempt
    const init1 = await request(app)
      .post('/api/v1/payments/phonepe/initiate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ orderId: retryOrderId });
    expect(init1.status).toBe(200);

    // Second retry attempt
    const init2 = await request(app)
      .post('/api/v1/payments/phonepe/initiate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ orderId: retryOrderId });
    expect(init2.status).toBe(200);
    expect(init2.body.data.redirectUrl).toBeDefined();
  });

  // Test 15: Client Payment Status Polling / Redirect Verification
  it('15. should verify and reconcile payment status on GET /api/v1/payments/:orderId/status', async () => {
    const res = await request(app)
      .get(`/api/v1/payments/${onlineOrderId}/status`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.order.paymentStatus).toBe(PaymentStatus.PAID);
    expect(res.body.data.payment.status).toBe(PaymentTransactionStatus.SUCCESS);
  });

  // Test 16: Admin Orders List with Filters
  it('16. should allow admin to view all orders with status filtering and metrics', async () => {
    const res = await request(app)
      .get('/api/v1/orders/admin?status=CONFIRMED')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.orders)).toBe(true);
    expect(res.body.data.total).toBeGreaterThan(0);
  });

  // Test 17: Admin Order Progression Status Update
  it('17. should allow admin to update order status through progression (PROCESSING -> PACKED -> OUT_FOR_DELIVERY)', async () => {
    const res = await request(app)
      .patch(`/api/v1/orders/admin/${codOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: OrderStatus.PROCESSING,
        comment: 'Fresh produce picked and sorted',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.order.orderStatus).toBe(OrderStatus.PROCESSING);
    expect(res.body.data.order.statusHistory.length).toBeGreaterThan(1);
  });

  // Test 18: Customer Notifications Retrieval
  it('18. should log and return customer notifications for order events', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.notifications)).toBe(true);
    expect(res.body.data.notifications.length).toBeGreaterThan(0);
  });
});
