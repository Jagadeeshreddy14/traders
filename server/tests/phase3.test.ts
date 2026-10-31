import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { Category } from '../src/models/Category';
import { Product } from '../src/models/Product';
import { Coupon, DiscountType } from '../src/models/Coupon';
import { DeliveryConfig } from '../src/models/DeliveryConfig';
import { Cart } from '../src/models/Cart';
import { Address } from '../src/models/Address';

let mongoServer: MongoMemoryServer;

describe('Phase 3: Shopping Cart, Inventory, Address, Coupon, and Checkout Preview API', () => {
  let customerToken: string;
  let otherCustomerToken: string;
  let inStockProductId: string;
  let limitedStockProductId: string;
  let outOfStockProductId: string;
  let savedAddressId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDatabase(uri);

    // 1. Create test category
    const cat = await Category.create({
      name: 'Staples & Fresh',
      slug: 'staples-fresh',
      displayOrder: 1,
    });

    // 2. Create products with varying stock
    const pInStock = await Product.create({
      name: 'Paven Premium Basmati Rice',
      slug: 'paven-basmati-rice-5kg',
      brand: 'Paven Choice',
      category: cat._id,
      price: 500, // MRP: ₹500
      discountedPrice: 420, // Selling: ₹420
      unit: '5 kg',
      stockQuantity: 50,
      isAvailable: true,
    });
    inStockProductId = pInStock._id.toString();

    const pLimited = await Product.create({
      name: 'Organic Toor Dal',
      slug: 'organic-toor-dal-1kg',
      brand: 'Tata Sampann',
      category: cat._id,
      price: 180, // MRP: ₹180
      discountedPrice: 150, // Selling: ₹150
      unit: '1 kg',
      stockQuantity: 3, // only 3 units
      isAvailable: true,
    });
    limitedStockProductId = pLimited._id.toString();

    const pOutOfStock = await Product.create({
      name: 'Organic Alphonso Mangoes',
      slug: 'organic-alphonso-mangoes',
      brand: 'Daily Harvest',
      category: cat._id,
      price: 600,
      discountedPrice: 500,
      unit: '1 box',
      stockQuantity: 0, // out of stock
      isAvailable: false,
    });
    outOfStockProductId = pOutOfStock._id.toString();

    // 3. Create DeliveryConfig
    await DeliveryConfig.create({
      deliveryCharge: 4000, // ₹40 in paise
      freeDeliveryThreshold: 49900, // ₹499 in paise
      packagingCharge: 1500, // ₹15 in paise
      minOrderAmount: 19900, // ₹199 in paise
      defaultDeliveryWindow: '30-45 mins',
      supportedPincodes: [
        { pincode: '500001', areaName: 'City Center', deliveryWindow: '25-40 mins', isServiceable: true },
        { pincode: '500034', areaName: 'Banjara Hills', deliveryWindow: '30-45 mins', isServiceable: true },
      ],
    });

    // 4. Create Coupons
    await Coupon.create({
      code: 'WELCOME100',
      description: 'Flat ₹100 off on ₹500',
      discountType: DiscountType.FLAT,
      discountValue: 10000, // ₹100
      minOrderValue: 50000, // ₹500
      validFrom: new Date(Date.now() - 10000),
      validUntil: new Date(Date.now() + 1000000),
      userUsageLimit: 1,
      isActive: true,
    });

    await Coupon.create({
      code: 'EXPIRED10',
      description: 'Expired coupon',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      minOrderValue: 10000,
      validFrom: new Date(Date.now() - 200000),
      validUntil: new Date(Date.now() - 100000),
      isActive: true,
    });

    // 5. Register customer 1
    const regRes1 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Aakash Verma',
        email: 'aakash.cart@example.com',
        password: 'Password@123',
        phone: '+919876500001',
      });
    customerToken = regRes1.body.data.tokens.accessToken;

    // Register customer 2 (for authorization tests)
    const regRes2 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Sunita Rao',
        email: 'sunita.rao@example.com',
        password: 'Password@123',
        phone: '+919876500002',
      });
    otherCustomerToken = regRes2.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // ==========================================
  // MODULE 1 & 2: SHOPPING CART & INVENTORY
  // ==========================================
  describe('Cart Operations & Inventory Validation', () => {
    it('1. Add product to cart', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: inStockProductId, quantity: 2 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cart.items.length).toBe(1);
      expect(res.body.data.cart.items[0].quantity).toBe(2);
      expect(res.body.data.cart.items[0].unitSellingPrice).toBe(420);
      expect(res.body.data.cart.items[0].subtotal).toBe(840);
      expect(res.body.data.cart.subtotal).toBe(840);
    });

    it('2. Update quantity', async () => {
      const res = await request(app)
        .put(`/api/v1/cart/items/${inStockProductId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 3 });

      expect(res.status).toBe(200);
      expect(res.body.data.cart.items[0].quantity).toBe(3);
      expect(res.body.data.cart.items[0].subtotal).toBe(1260);
    });

    it('3. Remove cart item', async () => {
      // Add a second item first
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: limitedStockProductId, quantity: 1 });

      const res = await request(app)
        .delete(`/api/v1/cart/items/${limitedStockProductId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      const remainingIds = res.body.data.cart.items.map((i: any) => i.productId);
      expect(remainingIds).not.toContain(limitedStockProductId);
      expect(remainingIds).toContain(inStockProductId);
    });

    it('4. Clear cart', async () => {
      const res = await request(app)
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.cart.items.length).toBe(0);
      expect(res.body.data.cart.subtotal).toBe(0);
    });

    it('5. Persist cart across requests', async () => {
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: inStockProductId, quantity: 1 });

      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.cart.items.length).toBe(1);
      expect(res.body.data.cart.items[0].productId).toBe(inStockProductId);
    });

    it('6. Synchronize cart across platforms (POST /api/v1/cart/sync)', async () => {
      const res = await request(app)
        .post('/api/v1/cart/sync')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ productId: limitedStockProductId, quantity: 2 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.cart.items.length).toBe(2);
      const dalItem = res.body.data.cart.items.find((i: any) => i.productId === limitedStockProductId);
      expect(dalItem).toBeDefined();
      expect(dalItem.quantity).toBe(2);
    });

    it('7. Reject quantities above available stock', async () => {
      // limitedStockProductId has only 3 in stock, already has 2 in cart
      const res = await request(app)
        .put(`/api/v1/cart/items/${limitedStockProductId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 10 });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/exceeds available stock/i);
    });

    it('8. Reject out-of-stock products', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: outOfStockProductId, quantity: 1 });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/out of stock|unavailable/i);
    });
  });

  // ==========================================
  // MODULE 3: ADDRESS MANAGEMENT & OWNERSHIP
  // ==========================================
  describe('Address Management & Security', () => {
    it('9. Address creation', async () => {
      const res = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          fullName: 'Aakash Verma',
          phone: '9876543210',
          houseNo: 'Flat 402, Green Meadows',
          street: 'Main Road',
          area: 'Abids',
          city: 'Hyderabad',
          state: 'Telangana',
          pincode: '500001',
          type: 'HOME',
          isDefault: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.address.recipientName).toBe('Aakash Verma');
      expect(res.body.data.address.postalCode).toBe('500001');
      expect(res.body.data.address.isDefault).toBe(true);
      savedAddressId = res.body.data.address.id;
    });

    it('10. Address ownership protection (prevent other user unauthorized access)', async () => {
      // User 2 attempts to get or delete User 1's address
      const resGet = await request(app)
        .get(`/api/v1/addresses/${savedAddressId}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(resGet.status).toBe(403);

      const resDel = await request(app)
        .delete(`/api/v1/addresses/${savedAddressId}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(resDel.status).toBe(403);
    });

    it('11. Address validation (reject invalid phone or PIN code)', async () => {
      // Invalid phone
      const resPhone = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          fullName: 'Test User',
          phone: '12345', // invalid phone
          pincode: '500001',
        });
      expect(resPhone.status).toBe(400);

      // Invalid PIN code
      const resPin = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          fullName: 'Test User',
          phone: '9876543210',
          pincode: '0000', // invalid PIN
        });
      expect(resPin.status).toBe(400);
    });
  });

  // ==========================================
  // MODULE 4, 5, 6: SERVICEABILITY & COUPONS
  // ==========================================
  describe('Delivery Serviceability & Coupons', () => {
    it('12. Delivery PIN code validation (serviceable vs non-serviceable)', async () => {
      // Serviceable
      const resServiceable = await request(app)
        .get('/api/v1/delivery/serviceability?pincode=500001');

      expect(resServiceable.status).toBe(200);
      expect(resServiceable.body.data.serviceable).toBe(true);
      expect(resServiceable.body.data.areaName).toBe('City Center');

      // Non-serviceable
      const resNonServiceable = await request(app)
        .get('/api/v1/delivery/serviceability?pincode=599999');

      expect(resNonServiceable.status).toBe(200);
      expect(resNonServiceable.body.data.serviceable).toBe(false);
      expect(resNonServiceable.body.data.message).toMatch(/outside our express delivery coverage/i);
    });

    it('13. Coupon validation (valid code discount calculation)', async () => {
      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'WELCOME100', subtotalPaise: 60000 }); // ₹600 subtotal

      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.discountPaise).toBe(10000); // ₹100 discount
    });

    it('14. Coupon expiry (reject expired coupon)', async () => {
      const res = await request(app)
        .post('/api/v1/coupons/validate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'EXPIRED10', subtotalPaise: 50000 });

      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(false);
      expect(res.body.data.message).toMatch(/expired/i);
    });
  });

  // ==========================================
  // MODULE 7: CHECKOUT PREVIEW & TAMPER PROTECTION
  // ==========================================
  describe('Checkout Preview & Price Calculation', () => {
    it('15. Backend price calculation and breakdown', async () => {
      // Cart currently has 1x Basmati (MRP 500, Selling 420) + 2x Dal (MRP 180, Selling 150) = 420 + 300 = 720
      const previewRes = await request(app)
        .post('/api/v1/checkout/preview')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ addressId: savedAddressId });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.success).toBe(true);
      const { pricing } = previewRes.body.data.preview;

      // Subtotal = 72000 paise (₹720)
      expect(pricing.itemsSubtotalPaise).toBe(72000);
      // Since subtotal (₹720) >= freeDeliveryThreshold (₹499), delivery is free
      expect(pricing.isFreeDelivery).toBe(true);
      expect(pricing.deliveryChargePaise).toBe(0);
      expect(pricing.packagingChargePaise).toBe(1500); // ₹15
      // Total payable = 72000 + 0 + 1500 = 73500 paise (₹735)
      expect(pricing.totalPayablePaise).toBe(73500);
    });

    it('16. Checkout preview with coupon application', async () => {
      const previewRes = await request(app)
        .post('/api/v1/checkout/preview')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ addressId: savedAddressId, couponCode: 'WELCOME100' });

      expect(previewRes.status).toBe(200);
      const { pricing } = previewRes.body.data.preview;
      expect(pricing.couponDiscountPaise).toBe(10000); // ₹100 discount
      // Total payable = 72000 - 10000 + 1500 = 63500 paise (₹635)
      expect(pricing.totalPayablePaise).toBe(63500);
    });

    it('17. Tampered client price rejection (backend always enforces DB prices)', async () => {
      // Malicious client tries to send fake total or prices in body
      const previewRes = await request(app)
        .post('/api/v1/checkout/preview')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          addressId: savedAddressId,
          totalAmount: 1, // client tries to claim total is ₹1
          itemsSubtotal: 1,
        });

      expect(previewRes.status).toBe(200);
      const { pricing } = previewRes.body.data.preview;
      // Backend completely ignores client-supplied values and evaluates genuine DB prices
      expect(pricing.itemsSubtotalPaise).toBe(72000);
      expect(pricing.totalPayablePaise).toBe(73500);
    });

    it('18. Concurrent inventory updates (capping and warnings on preview when stock drops)', async () => {
      // Simulate inventory dropping below in-cart quantity while user was browsing
      await Product.findByIdAndUpdate(limitedStockProductId, { stockQuantity: 1 });

      const cartRes = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(cartRes.status).toBe(200);
      const dal = cartRes.body.data.cart.items.find((i: any) => i.productId === limitedStockProductId);
      expect(dal.stockWarning).toBeDefined();
      expect(dal.stockWarning).toMatch(/only 1 units available/i);
    });
  });
});
