import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { Category } from '../src/models/Category';
import { Product } from '../src/models/Product';
import { Inventory } from '../src/models/Inventory';
import { User, UserRole } from '../src/models/User';
import { Order, OrderStatus, PaymentStatus } from '../src/models/Order';
import { DeliveryPartner } from '../src/models/DeliveryPartner';
import { Supplier } from '../src/models/Supplier';
import { Purchase } from '../src/models/Purchase';
import { Expense } from '../src/models/Expense';
import { StoreSettings } from '../src/models/StoreSettings';
import { AuthService } from '../src/services/auth.service';

let mongoServer: MongoMemoryServer;

describe('Phase 5: Admin Dashboard and Store Management API', () => {
  let adminToken: string;
  let staffToken: string;
  let customerToken: string;
  let adminUserId: string;
  let customerUserId: string;
  let testCategoryId: string;
  let testProductId: string;
  let testSupplierId: string;
  let testDeliveryPartnerId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDatabase(uri);

    // 1. Create Admin User
    const adminPassHash = await AuthService.hashPassword('Admin@SecretPass123!');
    const admin = await User.create({
      name: 'Paven Store Administrator',
      email: 'admin_test@paventraders.com',
      passwordHash: adminPassHash,
      role: UserRole.ADMIN,
      permissions: ['ALL'],
      isActive: true,
      isVerified: true,
    });
    adminUserId = admin._id.toString();
    adminToken = AuthService.generateTokens(admin).accessToken;

    // 2. Create Staff User
    const staffPassHash = await AuthService.hashPassword('Staff@SecretPass123!');
    const staff = await User.create({
      name: 'Operations Staff Member',
      email: 'staff_test@paventraders.com',
      passwordHash: staffPassHash,
      role: UserRole.STAFF,
      permissions: ['PRODUCTS', 'INVENTORY', 'ORDERS'],
      isActive: true,
      isVerified: true,
    });
    staffToken = AuthService.generateTokens(staff).accessToken;

    // 3. Create Customer User
    const custPassHash = await AuthService.hashPassword('Customer@123!');
    const customer = await User.create({
      name: 'Ravi Teja Customer',
      email: 'ravi_customer@test.com',
      passwordHash: custPassHash,
      role: UserRole.CUSTOMER,
      isActive: true,
      isVerified: true,
    });
    customerUserId = customer._id.toString();
    customerToken = AuthService.generateTokens(customer).accessToken;

    // 4. Create Category
    const category = await Category.create({
      name: 'Spices and Condiments',
      slug: 'spices-and-condiments',
      icon: '🌶️',
      displayOrder: 1,
      subcategories: ['Whole Spices', 'Powdered Masalas'],
    });
    testCategoryId = category._id.toString();

    // 5. Create Product
    const product = await Product.create({
      name: 'Everest Turmeric Powder',
      slug: 'everest-turmeric-500g',
      brand: 'Everest',
      category: category._id,
      sku: 'EVR-TUR-500',
      barcode: '8901234567890',
      purchasePrice: 120, // ₹120
      price: 160, // ₹160
      discountedPrice: 145, // ₹145
      taxRate: 5,
      unit: '500 g',
      stockQuantity: 50,
      isAvailable: true,
    });
    testProductId = product._id.toString();

    await Inventory.create({
      product: product._id,
      currentStock: 50,
      reservedStock: 0,
      minThreshold: 15,
      batchNumber: 'BATCH-2026-01',
      lastRestockedAt: new Date(),
    });

    // 6. Create Delivery Partner
    const partner = await DeliveryPartner.create({
      user: staff._id,
      vehicleType: 'MOTORCYCLE',
      vehicleNumber: 'TS-09-EA-9999',
      licenseNumber: 'DL-TS-2026-1111',
      status: 'AVAILABLE',
    });
    testDeliveryPartnerId = partner._id.toString();

    // 7. Create Supplier
    const supplier = await Supplier.create({
      name: 'Telangana Agro Wholesale Distributors',
      contactPerson: 'Venkat Rao',
      phone: '9848012345',
      email: 'sales@telanganaagro.com',
      gstin: '36ABCDE1234F1Z5',
      address: 'Shop 4, Kothapet Fruit Market Road, Hyderabad',
    });
    testSupplierId = supplier._id.toString();

    // 8. Create some initial orders for financial accuracy testing:
    // Order 1: Paid online order (₹500 = 50000 paise)
    await Order.create({
      orderNumber: 'PT-20261031-PAID1',
      invoiceNumber: 'INV-2026-PAID1',
      user: customer._id,
      items: [
        {
          product: product._id,
          name: product.name,
          unit: product.unit,
          quantity: 2,
          unitPrice: 25000,
          totalUnitPrice: 50000,
        },
      ],
      deliveryAddress: {
        recipientName: 'Ravi Teja Customer',
        recipientPhone: '9876543210',
        streetAddress: 'Flat 101, Lake View Apts',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500001',
      },
      orderStatus: OrderStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'ONLINE',
      totalAmount: 50000,
      discountAmount: 0,
      deliveryFee: 0,
      packagingFee: 0,
      finalAmount: 50000,
    });

    // Order 2: COD Collected order (₹300 = 30000 paise)
    await Order.create({
      orderNumber: 'PT-20261031-COD1',
      invoiceNumber: 'INV-2026-COD1',
      user: customer._id,
      items: [
        {
          product: product._id,
          name: product.name,
          unit: product.unit,
          quantity: 1,
          unitPrice: 30000,
          totalUnitPrice: 30000,
        },
      ],
      deliveryAddress: {
        recipientName: 'Ravi Teja Customer',
        recipientPhone: '9876543210',
        streetAddress: 'Flat 101, Lake View Apts',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500001',
      },
      orderStatus: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: 'COD',
      totalAmount: 30000,
      discountAmount: 0,
      deliveryFee: 0,
      packagingFee: 0,
      finalAmount: 30000,
      codCollectionInfo: {
        collectedBy: admin._id,
        collectedAt: new Date(),
        notes: 'Collected on delivery',
      },
    });

    // Order 3: COD Outstanding order (₹200 = 20000 paise)
    await Order.create({
      orderNumber: 'PT-20261031-COD2',
      user: customer._id,
      items: [
        {
          product: product._id,
          name: product.name,
          unit: product.unit,
          quantity: 1,
          unitPrice: 20000,
          totalUnitPrice: 20000,
        },
      ],
      deliveryAddress: {
        recipientName: 'Ravi Teja Customer',
        recipientPhone: '9876543210',
        streetAddress: 'Flat 101, Lake View Apts',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500001',
      },
      orderStatus: OrderStatus.PROCESSING,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: 'COD',
      totalAmount: 20000,
      discountAmount: 0,
      deliveryFee: 0,
      packagingFee: 0,
      finalAmount: 20000,
    });

    // Order 4: Cancelled order (₹400 = 40000 paise)
    await Order.create({
      orderNumber: 'PT-20261031-CAN1',
      user: customer._id,
      items: [
        {
          product: product._id,
          name: product.name,
          unit: product.unit,
          quantity: 1,
          unitPrice: 40000,
          totalUnitPrice: 40000,
        },
      ],
      deliveryAddress: {
        recipientName: 'Ravi Teja Customer',
        recipientPhone: '9876543210',
        streetAddress: 'Flat 101, Lake View Apts',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500001',
      },
      orderStatus: OrderStatus.CANCELLED,
      paymentStatus: PaymentStatus.FAILED,
      paymentMethod: 'ONLINE',
      totalAmount: 40000,
      discountAmount: 0,
      deliveryFee: 0,
      packagingFee: 0,
      finalAmount: 40000,
    });

    // 9. Initial Expense
    await Expense.create({
      title: 'Store Rent - October 2026',
      category: 'RENT',
      amount: 15000,
      date: new Date(),
      paymentMethod: 'BANK_TRANSFER',
      recordedBy: admin._id,
    });
  });

  afterAll(async () => {
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // 1. Dashboard Analytics & Financial Breakdown
  describe('1. Dashboard Analytics & Financial Accuracy API', () => {
    it('GET /api/v1/admin/analytics/dashboard should return live KPIs and accurate non-inflated financials', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { kpi, financialSummary, salesChart, recentOrders } = res.body.data;
      expect(kpi).toBeDefined();
      expect(kpi.totalCustomers).toBeGreaterThanOrEqual(1);
      expect(kpi.activeProducts).toBeGreaterThanOrEqual(1);

      // Financial Accuracy Verification:
      // Paid online: ₹500
      // COD collected: ₹300
      // COD outstanding: ₹200 (must NOT be counted in revenue collected)
      // Cancelled order: ₹400 (must NOT be counted in revenue collected)
      expect(financialSummary.paidOnlineRevenue).toBe(500);
      expect(financialSummary.codCollected).toBe(300);
      expect(financialSummary.codOutstanding).toBe(200);
      expect(financialSummary.totalRevenueReceived).toBe(800); // 500 + 300
      expect(financialSummary.cancelledOrdersCount).toBe(1);
      expect(financialSummary.expenses).toBe(15000);

      // Basic estimated profit: Revenue (800) - Purchase costs (0) - Expenses (15000) = -14200
      expect(financialSummary.basicEstimatedProfit).toBe(800 - 0 - 15000);

      expect(Array.isArray(salesChart)).toBe(true);
      expect(salesChart.length).toBe(7);
      expect(Array.isArray(recentOrders)).toBe(true);
    });

    it('GET /api/v1/admin/analytics/sales-report should return date-wise sales summary', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/sales-report')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.summary).toBeDefined();
      expect(Array.isArray(res.body.data.dailyBreakdown)).toBe(true);
    });

    it('should reject unauthorized access from regular customers', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/dashboard')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });
  });

  // 2. Product Management CRUD
  describe('2. Product Management CRUD API', () => {
    let createdProductId: string;

    it('POST /api/v1/admin/products should create product, initialize inventory, and record stock movement', async () => {
      const payload = {
        name: 'Tata Sampann Unpolished Toor Dal',
        brand: 'Tata Sampann',
        category: testCategoryId,
        sku: 'TAT-TOOR-1KG',
        barcode: '8901234567899',
        purchasePrice: 110,
        price: 155,
        discountedPrice: 140,
        taxRate: 5,
        unit: '1 kg',
        stockQuantity: 40,
        variants: [{ name: '500g', price: 80, stockQuantity: 20 }],
        images: ['https://images.unsplash.com/sample.jpg'],
        isAvailable: true,
        isFeatured: true,
        tags: ['dal', 'staples'],
        batchNumber: 'BATCH-2026-99',
        minThreshold: 10,
      };

      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.product).toBeDefined();
      expect(res.body.data.product.name).toBe(payload.name);
      expect(res.body.data.product.barcode).toBe(payload.barcode);
      expect(res.body.data.product.purchasePrice).toBe(110);

      createdProductId = res.body.data.product.id || res.body.data.product._id;

      // Verify inventory record was created
      const inv = await Inventory.findOne({ product: createdProductId });
      expect(inv).toBeDefined();
      expect(inv?.currentStock).toBe(40);
      expect(inv?.batchNumber).toBe('BATCH-2026-99');
    });

    it('POST /api/v1/admin/products should enforce uniqueness of SKU and barcode', async () => {
      const duplicatePayload = {
        name: 'Duplicate SKU Product',
        category: testCategoryId,
        sku: 'TAT-TOOR-1KG', // Already used
        barcode: '8901234567899', // Already used
        price: 100,
        unit: '1 kg',
      };

      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicatePayload);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already in use');
    });

    it('PUT /api/v1/admin/products/:id should edit product and synchronize stock', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 165,
          stockQuantity: 65, // changed from 40 to 65
          brand: 'Tata Consumer',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.product.price).toBe(165);
      expect(res.body.data.product.stockQuantity).toBe(65);

      const inv = await Inventory.findOne({ product: createdProductId });
      expect(inv?.currentStock).toBe(65);
    });

    it('PATCH /api/v1/admin/products/:id/status should toggle availability status', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/products/${createdProductId}/status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.product.isAvailable).toBe(false);
    });

    it('GET /api/v1/admin/products should list products with stock information', async () => {
      const res = await request(app)
        .get('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.products)).toBe(true);
      expect(res.body.data.products.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.products[0].inventory).toBeDefined();
    });
  });

  // 3. Category Management CRUD
  describe('3. Category Management CRUD API', () => {
    let createdCatId: string;

    it('POST /api/v1/admin/categories should create category with subcategories', async () => {
      const res = await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Fresh Fruits and Greens',
          description: 'Farm-fresh apples, bananas, and daily leafy greens',
          icon: '🍏',
          displayOrder: 2,
          subcategories: ['Citrus Fruits', 'Leafy Vegetables', 'Root Vegetables'],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.category.name).toBe('Fresh Fruits and Greens');
      expect(res.body.data.category.subcategories.length).toBe(3);
      createdCatId = res.body.data.category.id || res.body.data.category._id;
    });

    it('PUT /api/v1/admin/categories/:id should update category', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/categories/${createdCatId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          displayOrder: 5,
          subcategories: ['Citrus Fruits', 'Exotic Vegetables'],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.category.displayOrder).toBe(5);
      expect(res.body.data.category.subcategories.length).toBe(2);
    });

    it('GET /api/v1/admin/categories should return all categories with product counts', async () => {
      const res = await request(app)
        .get('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.categories)).toBe(true);
      expect(res.body.data.categories[0].productCount).toBeDefined();
    });
  });

  // 4. Inventory Management & Negative Stock Prevention
  describe('4. Inventory Management & Negative Stock Prevention API', () => {
    it('POST /api/v1/admin/inventory/adjust should successfully STOCK_IN and log movement', async () => {
      const res = await request(app)
        .post('/api/v1/admin/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProductId,
          type: 'STOCK_IN',
          quantity: 25,
          reason: 'Direct store delivery replenishment',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.inventory.currentStock).toBe(75); // 50 + 25
      expect(res.body.data.productStockQuantity).toBe(75);
    });

    it('POST /api/v1/admin/inventory/adjust should PREVENT negative inventory on excessive STOCK_OUT', async () => {
      const res = await request(app)
        .post('/api/v1/admin/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: testProductId,
          type: 'STOCK_OUT',
          quantity: 200, // Current stock is 75, so 200 is impossible
          reason: 'Damaged stock deduction',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Negative inventory prevented');

      // Verify stock remained unchanged
      const inv = await Inventory.findOne({ product: testProductId });
      expect(inv?.currentStock).toBe(75);
    });

    it('GET /api/v1/admin/inventory/movements should return audit history of stock adjustments', async () => {
      const res = await request(app)
        .get('/api/v1/admin/inventory/movements')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.movements)).toBe(true);
      expect(res.body.data.movements.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/admin/inventory/alerts should list items below threshold', async () => {
      const res = await request(app)
        .get('/api/v1/admin/inventory/alerts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.alerts).toBeDefined();
    });
  });

  // 5. Customer Management
  describe('5. Customer Management API', () => {
    it('GET /api/v1/admin/customers should list customers with order statistics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/customers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.customers)).toBe(true);
      const customer = res.body.data.customers.find((c: any) => c.email === 'ravi_customer@test.com');
      expect(customer).toBeDefined();
      expect(customer.totalOrders).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/admin/customers/:id should return profile, addresses, and order history', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/customers/${customerUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.customer).toBeDefined();
      expect(Array.isArray(res.body.data.orders)).toBe(true);
    });

    it('PATCH /api/v1/admin/customers/:id/status should toggle account activation status', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/customers/${customerUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.customer.isActive).toBe(false);

      // Restore active status
      await request(app)
        .patch(`/api/v1/admin/customers/${customerUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`);
    });
  });

  // 6. Staff Management & Activity Logs
  describe('6. Staff Management & Activity Logs API', () => {
    let createdStaffId: string;

    it('POST /api/v1/admin/staff should securely create new staff account with hashed password', async () => {
      const res = await request(app)
        .post('/api/v1/admin/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Pooja Dispatch Supervisor',
          email: 'pooja.supervisor@paventraders.com',
          password: 'SupervisorPass2026!',
          phone: '9849012399',
          role: UserRole.STAFF,
          permissions: ['ORDERS', 'INVENTORY'],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.staff.name).toBe('Pooja Dispatch Supervisor');
      expect(res.body.data.staff.role).toBe(UserRole.STAFF);
      expect(res.body.data.staff.passwordHash).toBeUndefined(); // Never returned!

      createdStaffId = res.body.data.staff.id || res.body.data.staff._id;
    });

    it('PATCH /api/v1/admin/staff/:id/permissions should update permissions', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/staff/${createdStaffId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissions: ['ORDERS', 'INVENTORY', 'PRODUCTS'] });

      expect(res.status).toBe(200);
      expect(res.body.data.staff.permissions).toContain('PRODUCTS');
    });

    it('GET /api/v1/admin/staff/audit-logs should return chronological activity logs', async () => {
      const res = await request(app)
        .get('/api/v1/admin/staff/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.logs)).toBe(true);
      expect(res.body.data.logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  // 7. Supplier Management
  describe('7. Supplier Management API', () => {
    let newSupplierId: string;

    it('POST /api/v1/admin/suppliers should create supplier profile', async () => {
      const res = await request(app)
        .post('/api/v1/admin/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Deccan Rice Mills Pvt Ltd',
          contactPerson: 'Srinivas Reddy',
          phone: '9988776655',
          email: 'srinivas@deccanrice.com',
          address: 'Miryalaguda Industrial Area, Nalgonda',
          gstin: '36ZZZZZ9999Z1Z8',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.supplier.name).toBe('Deccan Rice Mills Pvt Ltd');
      newSupplierId = res.body.data.supplier.id || res.body.data.supplier._id;
    });

    it('GET /api/v1/admin/suppliers should list suppliers with purchase counts', async () => {
      const res = await request(app)
        .get('/api/v1/admin/suppliers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.suppliers)).toBe(true);
    });
  });

  // 8. Purchase Management & Confirmed Receipt
  describe('8. Purchase Management & Confirmed Stock Receipt API', () => {
    let createdPurchaseId: string;

    it('POST /api/v1/admin/purchases should create purchase in ORDERED status WITHOUT updating stock', async () => {
      const initialInv = await Inventory.findOne({ product: testProductId });
      const initialStock = initialInv?.currentStock || 0;

      const res = await request(app)
        .post('/api/v1/admin/purchases')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierId: testSupplierId,
          supplierInvoiceNumber: 'INV-TELANGANA-9001',
          purchaseDate: new Date(),
          items: [
            {
              productId: testProductId,
              quantity: 30,
              purchasePrice: 115,
              batchNumber: 'BATCH-2026-PURCHASE-1',
            },
          ],
          taxAmount: 172.5,
          receiveImmediately: false, // ORDERED status!
        });

      expect(res.status).toBe(201);
      expect(res.body.data.purchase.status).toBe('ORDERED');
      createdPurchaseId = res.body.data.purchase.id || res.body.data.purchase._id;

      // Verify stock was NOT updated
      const invAfterOrdered = await Inventory.findOne({ product: testProductId });
      expect(invAfterOrdered?.currentStock).toBe(initialStock);
    });

    it('PATCH /api/v1/admin/purchases/:id/receive should CONFIRM receipt and update stock', async () => {
      const initialInv = await Inventory.findOne({ product: testProductId });
      const initialStock = initialInv?.currentStock || 0;

      const res = await request(app)
        .patch(`/api/v1/admin/purchases/${createdPurchaseId}/receive`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.purchase.status).toBe('RECEIVED');

      // Verify stock WAS updated by 30 units
      const invAfterReceived = await Inventory.findOne({ product: testProductId });
      expect(invAfterReceived?.currentStock).toBe(initialStock + 30);

      const prod = await Product.findById(testProductId);
      expect(prod?.stockQuantity).toBe(initialStock + 30);
      expect(prod?.purchasePrice).toBe(115);
    });

    it('PATCH /api/v1/admin/purchases/:id/receive should PREVENT double receipt', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/purchases/${createdPurchaseId}/receive`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already been marked as RECEIVED');
    });
  });

  // 9. Expenses Management
  describe('9. Expenses Management API', () => {
    let createdExpenseId: string;

    it('POST /api/v1/admin/expenses should record store operational expense', async () => {
      const res = await request(app)
        .post('/api/v1/admin/expenses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Store Staff Salaries - Oct 2026',
          category: 'SALARIES',
          amount: 28000,
          paymentMethod: 'BANK_TRANSFER',
          referenceNumber: 'NEFT99887711',
          notes: 'Disbursed to 2 store associates and 1 helper',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.expense.title).toBe('Store Staff Salaries - Oct 2026');
      expect(res.body.data.expense.amount).toBe(28000);
      createdExpenseId = res.body.data.expense.id || res.body.data.expense._id;
    });

    it('GET /api/v1/admin/expenses/summary should return expense breakdown by category', async () => {
      const res = await request(app)
        .get('/api/v1/admin/expenses/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalExpensesRupees).toBeGreaterThanOrEqual(28000);
      expect(Array.isArray(res.body.data.byCategory)).toBe(true);
    });
  });

  // 10. Store Settings & Operating Status
  describe('10. Store Settings & Operating Status API', () => {
    it('GET /api/v1/admin/settings should return store settings', async () => {
      const res = await request(app)
        .get('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.settings.storeName).toBe('Paven Traders');
      expect(res.body.data.settings.isOpen).toBe(true);
    });

    it('PUT /api/v1/admin/settings should update settings and sync delivery rules', async () => {
      const res = await request(app)
        .put('/api/v1/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          storeName: 'Paven Traders - City Express Store',
          deliveryChargeRupees: 45, // ₹45
          minOrderAmountRupees: 149, // ₹149
          supportedPincodes: [
            {
              pincode: '500001',
              areaName: 'City Center Hub',
              deliveryWindow: '25-35 mins',
              isServiceable: true,
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.settings.storeName).toBe('Paven Traders - City Express Store');
      expect(res.body.data.settings.deliveryChargeRupees).toBe(45);
    });

    it('PATCH /api/v1/admin/settings/operating-status should toggle store open/close', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/settings/operating-status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isOpen).toBe(false);

      // Re-open
      const resReopen = await request(app)
        .patch('/api/v1/admin/settings/operating-status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resReopen.status).toBe(200);
      expect(resReopen.body.data.isOpen).toBe(true);
    });
  });

  // 11. Order Partner Assignment and Refund
  describe('11. Order Management: Partner Assignment and Refund API', () => {
    let orderToRefundId: string;

    beforeAll(async () => {
      const ord = await Order.findOne({ orderNumber: 'PT-20261031-PAID1' });
      orderToRefundId = ord?._id.toString() || '';
    });

    it('PATCH /api/v1/orders/admin/:id/assign-partner should assign delivery fleet partner', async () => {
      const res = await request(app)
        .patch(`/api/v1/orders/admin/${orderToRefundId}/assign-partner`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ deliveryPartnerId: testDeliveryPartnerId });

      expect(res.status).toBe(200);
      expect(res.body.data.order.deliveryPartner).toBe(testDeliveryPartnerId);
    });

    it('PATCH /api/v1/orders/admin/:id/refund should mark order as REFUNDED', async () => {
      const res = await request(app)
        .patch(`/api/v1/orders/admin/${orderToRefundId}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Customer requested refund due to delivery schedule' });

      expect(res.status).toBe(200);
      expect(res.body.data.order.orderStatus).toBe(OrderStatus.REFUNDED);
      expect(res.body.data.order.paymentStatus).toBe(PaymentStatus.REFUNDED);
    });
  });
});
