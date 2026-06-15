import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Wrench,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  User,
  FileCheck,
} from 'lucide-react';
import { useAuthStore, hasPermission } from '../../stores/authStore';
import type { PermissionKey } from '../../types';
import { useNotificationStore } from '../../stores/notificationStore';
import Logo from '../Logo';
import { useState, useEffect } from 'react';
import clsx from 'clsx';

const Layout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id);
    }
  }, [user?.id, fetchNotifications]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const hp = (key: PermissionKey) => hasPermission(user, key);

  const navItems = [
    {
      label: 'لوحة التحكم',
      icon: LayoutDashboard,
      path: '/',
      show: hp('dashboard'),
    },
    {
      label: 'إغلاق اليوم',
      icon: FileCheck,
      path: '/daily-close',
      show: true,
    },
    {
      label: 'المخزون',
      icon: Package,
      children: [
        { label: 'كل المنتجات', path: '/inventory', perm: 'inventory' as PermissionKey },
        { label: 'إضافة منتج', path: '/inventory/add', perm: 'inventory_add' as PermissionKey },
        { label: 'تنبيهات المخزون', path: '/inventory/warnings', perm: 'inventory_warnings' as PermissionKey },
        { label: 'إدارة الأصناف', path: '/inventory/categories', perm: 'inventory_categories' as PermissionKey },
        { label: 'إدارة الألوان', path: '/inventory/colors', perm: 'inventory_colors' as PermissionKey },
      ],
      show: hp('inventory') || hp('inventory_add') || hp('inventory_warnings') || hp('inventory_categories') || hp('inventory_colors'),
    },
    {
      label: 'المبيعات',
      icon: ShoppingCart,
      children: [
        { label: 'فاتورة جديدة', path: '/sales/new', perm: 'sales_create' as PermissionKey },
        { label: 'كل الفواتير', path: '/sales/invoices', perm: 'sales' as PermissionKey },
      ],
      show: hp('sales') || hp('sales_create'),
    },
    {
      label: 'الزباين',
      icon: Users,
      children: [
        { label: 'كل الزباين', path: '/customers', perm: 'customers' as PermissionKey },
        { label: 'الصنايعية', path: '/customers/craftsmen', perm: 'customers_craftsmen' as PermissionKey },
        { label: 'إضافة زبون', path: '/customers/add', perm: 'customers_add' as PermissionKey },
      ],
      show: hp('customers') || hp('customers_craftsmen') || hp('customers_add'),
    },
    {
      label: 'قسم التنفيذ',
      icon: Wrench,
      children: [
        { label: 'مشاريعي', path: '/projects', perm: 'projects' as PermissionKey },
        { label: 'طلبات الكشف', path: '/projects/inspections', perm: 'projects_inspections' as PermissionKey },
        { label: 'مشروع جديد', path: '/projects/new', perm: 'projects' as PermissionKey },
      ],
      show: hp('projects') || hp('projects_inspections'),
    },
    {
      label: 'التقارير',
      icon: BarChart3,
      children: [
        { label: 'تقرير اليوم', path: '/reports/daily', perm: 'reports' as PermissionKey },
        { label: 'تقرير الأسبوع', path: '/reports/weekly', perm: 'reports' as PermissionKey },
      ],
      show: hp('reports'),
    },
    {
      label: 'الإعدادات',
      icon: Settings,
      children: [
        { label: 'إدارة المستخدمين', path: '/admin/users', perm: 'admin_users' as PermissionKey },
        { label: 'إدارة المخازن', path: '/admin/warehouses', perm: 'admin_warehouses' as PermissionKey },
        { label: 'إدارة الأسعار', path: '/admin/pricing', perm: 'admin_pricing' as PermissionKey },
        { label: 'إعدادات النظام', path: '/admin/settings', perm: 'admin_settings' as PermissionKey },
      ],
      show: hp('admin_users') || hp('admin_warehouses') || hp('admin_pricing') || hp('admin_settings'),
    },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (children: { path: string }[]) =>
    children.some((child) => location.pathname.startsWith(child.path));

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed right-0 top-0 h-full bg-sidebar-bg text-sidebar-text transition-all duration-300 z-40',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-hover">
          <Link to="/" className="flex items-center gap-3">
            {sidebarOpen ? (
              <Logo variant="full" size="sm" theme="dark" />
            ) : (
              <Logo variant="icon" size="sm" theme="dark" />
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-sidebar-hover"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-200px)]">
          {navItems
            .filter((item) => item.show)
            .map((item) => (
              <div key={item.label}>
                {item.children ? (
                  <div>
                    <button
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                        isParentActive(item.children)
                          ? 'bg-sidebar-active text-gold-500'
                          : 'hover:bg-sidebar-hover'
                      )}
                    >
                      <item.icon size={20} />
                      {sidebarOpen && <span>{item.label}</span>}
                    </button>
                    {sidebarOpen && (
                      <div className="mr-8 mt-1 space-y-1">
                        {item.children
                          .filter((child) => !child.perm || hp(child.perm))
                          .map((child) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={clsx(
                              'block px-3 py-2 rounded-lg text-sm transition-colors',
                              isActive(child.path) || location.pathname.startsWith(child.path + '/')
                                ? 'bg-gold-500 text-sidebar-bg font-semibold'
                                : 'hover:bg-sidebar-hover text-gray-300'
                            )}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to={item.path!}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                      isActive(item.path!)
                        ? 'bg-gold-500 text-sidebar-bg font-semibold'
                        : 'hover:bg-sidebar-hover'
                    )}
                  >
                    <item.icon size={20} />
                    {sidebarOpen && <span>{item.label}</span>}
                  </Link>
                )}
              </div>
            ))}
        </nav>

        {/* User info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-hover">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sidebar-hover flex items-center justify-center">
              <User size={20} />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{user?.name}</p>
                <p className="text-xs text-gray-400">
                  {user?.role === 'ADMIN' && 'مدير النظام'}
                  {user?.role === 'EMPLOYEE' && 'موظف'}
                  {user?.role === 'CRAFTSMAN' && 'صنايعي'}
                  {user?.role === 'PROJECT_MANAGER' && 'مدير مشاريع'}
                </p>
              </div>
            )}
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-sidebar-hover text-gray-400"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={clsx(
          'flex-1 overflow-auto transition-all duration-300',
          sidebarOpen ? 'mr-64' : 'mr-20'
        )}
      >
        {/* Top bar */}
        <header className="bg-white shadow-sm px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-800">
                {user?.warehouse?.name || 'Magic - نظام إدارة الديكور'}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 rounded-lg hover:bg-gray-100"
                >
                  <Bell size={22} className="text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <NotificationDropdown onClose={() => setNotificationsOpen(false)} />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const NotificationDropdown: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { notifications, markAsRead } = useNotificationStore();
  // const { user } = useAuthStore();

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold">الإشعارات</h3>
      </div>

      {recentNotifications.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          لا توجد إشعارات
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          {recentNotifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => markAsRead(notification.id)}
              className={clsx(
                'w-full p-4 text-right border-b border-gray-100 hover:bg-gray-50 transition-colors',
                !notification.is_read && 'bg-gold-50'
              )}
            >
              <p className="font-semibold text-sm">{notification.title}</p>
              <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(notification.created_at).toLocaleDateString('ar')}
              </p>
            </button>
          ))}
        </div>
      )}

      <Link
        to="/notifications"
        onClick={onClose}
        className="block p-4 text-center text-gold-600 hover:bg-gray-50 font-semibold"
      >
        عرض الكل
      </Link>
    </div>
  );
};

export default Layout;
