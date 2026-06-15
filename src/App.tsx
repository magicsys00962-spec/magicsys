import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Stores
import { useAuthStore, hasPermission } from './stores/authStore';
import type { PermissionKey } from './types';

// Components
import Logo from './components/Logo';

// Layout
import Layout from './components/layout/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

// Inventory pages
import InventoryPage from './pages/inventory/InventoryPage';
import ProductFormPage from './pages/inventory/ProductFormPage';
import StockWarningsPage from './pages/inventory/StockWarningsPage';
import CategoriesPage from './pages/inventory/CategoriesPage';
import ColorsPage from './pages/inventory/ColorsPage';

// Sales pages
import NewInvoicePage from './pages/sales/NewInvoicePage';
import InvoicesListPage from './pages/sales/InvoicesListPage';
import InvoiceDetailPage from './pages/sales/InvoiceDetailPage';

// Customers pages
import CustomersListPage from './pages/customers/CustomersListPage';
import CraftsmenPage from './pages/customers/CraftsmenPage';
import CustomerAddPage from './pages/customers/CustomerAddPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';

// Projects pages
import ProjectsListPage from './pages/projects/ProjectsListPage';
import ProjectFormPage from './pages/projects/ProjectFormPage';
import ProjectDetailPage from './pages/projects/ProjectDetailPage';
import InspectionRequestsPage from './pages/projects/InspectionRequestsPage';

// Reports pages
import DailyReportPage from './pages/reports/DailyReportPage';
import WeeklyReportPage from './pages/reports/WeeklyReportPage';
import DailyClosePage from './pages/reports/DailyClosePage';

// Admin pages
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminWarehousesPage from './pages/admin/AdminWarehousesPage';
import AdminPricingPage from './pages/admin/AdminPricingPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';

// Notifications
import NotificationsPage from './pages/NotificationsPage';

// Protected Route Component
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredPermission?: PermissionKey;
  requireAuth?: boolean;
}> = ({ children, allowedRoles, requiredPermission, requireAuth = true }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto mb-4 animate-pulse">
            <Logo variant="icon" size="md" theme="light" />
          </div>
          <p className="text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  if (requiredPermission && user && !hasPermission(user, requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Auth Check Component
const AuthCheck: React.FC = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return null;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthCheck />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
            fontFamily: 'Cairo, sans-serif',
          },
          success: {
            iconTheme: {
              primary: '#C9A84C',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <ProtectedRoute requireAuth={false}>
              <LoginPage />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes with Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route index element={<DashboardPage />} />

          {/* Daily Close - accessible to all users */}
          <Route path="daily-close" element={<DailyClosePage />} />

          {/* Inventory */}
          <Route path="inventory">
            <Route index element={<ProtectedRoute requiredPermission="inventory"><InventoryPage /></ProtectedRoute>} />
            <Route path="add" element={<ProtectedRoute requiredPermission="inventory_add"><ProductFormPage /></ProtectedRoute>} />
            <Route path=":id" element={<ProtectedRoute requiredPermission="inventory"><ProductFormPage /></ProtectedRoute>} />
            <Route path=":id/edit" element={<ProtectedRoute requiredPermission="inventory"><ProductFormPage /></ProtectedRoute>} />
            <Route path="warnings" element={<ProtectedRoute requiredPermission="inventory_warnings"><StockWarningsPage /></ProtectedRoute>} />
            <Route path="categories" element={<ProtectedRoute requiredPermission="inventory_categories"><CategoriesPage /></ProtectedRoute>} />
            <Route path="colors" element={<ProtectedRoute requiredPermission="inventory_categories"><ColorsPage /></ProtectedRoute>} />
          </Route>

          {/* Sales */}
          <Route path="sales">
            <Route path="new" element={<ProtectedRoute requiredPermission="sales_create"><NewInvoicePage /></ProtectedRoute>} />
            <Route path="invoices" element={<ProtectedRoute requiredPermission="sales"><InvoicesListPage /></ProtectedRoute>} />
            <Route path="invoices/:id" element={<ProtectedRoute requiredPermission="sales"><InvoiceDetailPage /></ProtectedRoute>} />
          </Route>

          {/* Customers */}
          <Route path="customers">
            <Route index element={<ProtectedRoute requiredPermission="customers"><CustomersListPage /></ProtectedRoute>} />
            <Route path="craftsmen" element={<ProtectedRoute requiredPermission="customers_craftsmen"><CraftsmenPage /></ProtectedRoute>} />
            <Route path="add" element={<ProtectedRoute requiredPermission="customers_add"><CustomerAddPage /></ProtectedRoute>} />
            <Route path=":id" element={<ProtectedRoute requiredPermission="customers"><CustomerDetailPage /></ProtectedRoute>} />
          </Route>

          {/* Projects */}
          <Route path="projects">
            <Route index element={<ProtectedRoute requiredPermission="projects"><ProjectsListPage /></ProtectedRoute>} />
            <Route path="new" element={<ProtectedRoute requiredPermission="projects"><ProjectFormPage /></ProtectedRoute>} />
            <Route path="inspections" element={<ProtectedRoute requiredPermission="projects_inspections"><InspectionRequestsPage /></ProtectedRoute>} />
            <Route path=":id" element={<ProtectedRoute requiredPermission="projects"><ProjectDetailPage /></ProtectedRoute>} />
          </Route>

          {/* Reports */}
          <Route path="reports">
            <Route path="daily" element={<ProtectedRoute requiredPermission="reports"><DailyReportPage /></ProtectedRoute>} />
            <Route path="weekly" element={<ProtectedRoute requiredPermission="reports"><WeeklyReportPage /></ProtectedRoute>} />
          </Route>

          {/* Admin */}
          <Route path="admin">
            <Route path="users" element={<ProtectedRoute requiredPermission="admin_users"><AdminUsersPage /></ProtectedRoute>} />
            <Route path="warehouses" element={<ProtectedRoute requiredPermission="admin_warehouses"><AdminWarehousesPage /></ProtectedRoute>} />
            <Route path="pricing" element={<ProtectedRoute requiredPermission="admin_pricing"><AdminPricingPage /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute requiredPermission="admin_settings"><AdminSettingsPage /></ProtectedRoute>} />
          </Route>

          {/* Notifications */}
          <Route path="notifications" element={<NotificationsPage />} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
