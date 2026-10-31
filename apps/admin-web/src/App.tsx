import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { AdminLayout } from './components/AdminLayout';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ProductsManagementPage } from './pages/ProductsManagementPage';
import { CategoriesManagementPage } from './pages/CategoriesManagementPage';
import { InventoryManagementPage } from './pages/InventoryManagementPage';
import { PurchasesManagementPage } from './pages/PurchasesManagementPage';
import { SuppliersManagementPage } from './pages/SuppliersManagementPage';
import { ExpensesManagementPage } from './pages/ExpensesManagementPage';
import { CustomersManagementPage } from './pages/CustomersManagementPage';
import { StaffManagementPage } from './pages/StaffManagementPage';
import { StoreSettingsPage } from './pages/StoreSettingsPage';
import { DeliverySettingsPage } from './pages/DeliverySettingsPage';
import { CouponManagementPage } from './pages/CouponManagementPage';
import { OrdersManagementPage } from './pages/OrdersManagementPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          <Route path="/login" element={<AdminLoginPage />} />
          <Route
            element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<AdminDashboardPage />} />
            <Route path="/orders" element={<OrdersManagementPage />} />
            <Route path="/products" element={<ProductsManagementPage />} />
            <Route path="/categories" element={<CategoriesManagementPage />} />
            <Route path="/inventory" element={<InventoryManagementPage />} />
            <Route path="/purchases" element={<PurchasesManagementPage />} />
            <Route path="/suppliers" element={<SuppliersManagementPage />} />
            <Route path="/expenses" element={<ExpensesManagementPage />} />
            <Route path="/customers" element={<CustomersManagementPage />} />
            <Route path="/staff" element={<StaffManagementPage />} />
            <Route path="/coupons" element={<CouponManagementPage />} />
            <Route path="/delivery-serviceability" element={<DeliverySettingsPage />} />
            <Route path="/settings" element={<StoreSettingsPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
};

export default App;
