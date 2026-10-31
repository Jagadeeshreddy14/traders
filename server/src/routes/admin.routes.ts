import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, authorizePermission } from '../middleware/authorize.middleware';
import { UserRole } from '../models/User';

// Analytics
import {
  getDashboardAnalytics,
  getSalesReport,
} from '../controllers/admin.analytics.controller';

// Products
import {
  getAdminProducts,
  createAdminProduct,
  getAdminProductById,
  updateAdminProduct,
  toggleAdminProductStatus,
  deleteAdminProduct,
} from '../controllers/admin.product.controller';

// Categories
import {
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  toggleAdminCategoryStatus,
  deleteAdminCategory,
} from '../controllers/admin.category.controller';

// Inventory
import {
  getAdminInventory,
  adjustStock,
  getStockMovements,
  getLowStockAlerts,
} from '../controllers/admin.inventory.controller';

// Customers
import {
  getAdminCustomers,
  getAdminCustomerDetails,
  toggleCustomerStatus,
} from '../controllers/admin.customer.controller';

// Staff & Audit
import {
  getAdminStaff,
  createAdminStaff,
  toggleStaffStatus,
  updateStaffPermissions,
  getAuditLogs,
} from '../controllers/admin.staff.controller';

// Suppliers
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierPurchases,
} from '../controllers/admin.supplier.controller';

// Purchases
import {
  getPurchases,
  createPurchase,
  getPurchaseById,
  receivePurchase,
  cancelPurchase,
} from '../controllers/admin.purchase.controller';

// Expenses
import {
  getExpenses,
  createExpense,
  deleteExpense,
  getExpenseSummary,
} from '../controllers/admin.expense.controller';

// Settings
import {
  getAdminStoreSettings,
  updateAdminStoreSettings,
  toggleStoreOperatingStatus,
} from '../controllers/admin.settings.controller';

const router = Router();

// Protect ALL admin routes with authentication
router.use(authenticate);

// 1. Dashboard Analytics & Reports (ADMIN or STAFF)
router.get(
  '/analytics/dashboard',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  getDashboardAnalytics
);
router.get(
  '/analytics/sales-report',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  getSalesReport
);

// 2. Product Management
router.get(
  '/products',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  getAdminProducts
);
router.post(
  '/products',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  createAdminProduct
);
router.get(
  '/products/:id',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  getAdminProductById
);
router.put(
  '/products/:id',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  updateAdminProduct
);
router.patch(
  '/products/:id/status',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  toggleAdminProductStatus
);
router.delete(
  '/products/:id',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  deleteAdminProduct
);

// 3. Category Management
router.get(
  '/categories',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  getAdminCategories
);
router.post(
  '/categories',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  createAdminCategory
);
router.put(
  '/categories/:id',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  updateAdminCategory
);
router.patch(
  '/categories/:id/status',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  toggleAdminCategoryStatus
);
router.delete(
  '/categories/:id',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  deleteAdminCategory
);

// 4. Inventory Management
router.get(
  '/inventory',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  getAdminInventory
);
router.post(
  '/inventory/adjust',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  adjustStock
);
router.get(
  '/inventory/movements',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  getStockMovements
);
router.get(
  '/inventory/alerts',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  getLowStockAlerts
);

// 5. Customer Management
router.get(
  '/customers',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  getAdminCustomers
);
router.get(
  '/customers/:id',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  getAdminCustomerDetails
);
router.patch(
  '/customers/:id/status',
  authorize(UserRole.ADMIN),
  toggleCustomerStatus
);

// 6. Staff Management & Activity Logs (Admin Only)
router.get(
  '/staff',
  authorize(UserRole.ADMIN),
  getAdminStaff
);
router.post(
  '/staff',
  authorize(UserRole.ADMIN),
  createAdminStaff
);
router.patch(
  '/staff/:id/status',
  authorize(UserRole.ADMIN),
  toggleStaffStatus
);
router.patch(
  '/staff/:id/permissions',
  authorize(UserRole.ADMIN),
  updateStaffPermissions
);
router.get(
  '/staff/audit-logs',
  authorize(UserRole.ADMIN),
  getAuditLogs
);

// 7. Supplier Management
router.get(
  '/suppliers',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  getSuppliers
);
router.post(
  '/suppliers',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  createSupplier
);
router.put(
  '/suppliers/:id',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  updateSupplier
);
router.delete(
  '/suppliers/:id',
  authorize(UserRole.ADMIN),
  deleteSupplier
);
router.get(
  '/suppliers/:id/purchases',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  getSupplierPurchases
);

// 8. Purchase Management
router.get(
  '/purchases',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  getPurchases
);
router.post(
  '/purchases',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  createPurchase
);
router.get(
  '/purchases/:id',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  getPurchaseById
);
router.patch(
  '/purchases/:id/receive',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  receivePurchase
);
router.patch(
  '/purchases/:id/cancel',
  authorize(UserRole.ADMIN),
  cancelPurchase
);

// 9. Expenses Management
router.get(
  '/expenses',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  getExpenses
);
router.post(
  '/expenses',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  createExpense
);
router.delete(
  '/expenses/:id',
  authorize(UserRole.ADMIN),
  deleteExpense
);
router.get(
  '/expenses/summary',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  getExpenseSummary
);

// 10. Store Settings
router.get(
  '/settings',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  getAdminStoreSettings
);
router.put(
  '/settings',
  authorize(UserRole.ADMIN),
  updateAdminStoreSettings
);
router.patch(
  '/settings/operating-status',
  authorize(UserRole.ADMIN, UserRole.STAFF),
  toggleStoreOperatingStatus
);

export default router;
