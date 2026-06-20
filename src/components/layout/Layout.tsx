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
  ChevronDown,
  ChevronLeft,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id);
    }
  }, [user?.id, fetchNotifications]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const hp = (key: PermissionKey) => hasPermission(user, key);

  const navItems = [
    { label: 'لوحة التحكم', icon: LayoutDashboard, path: '/', show: hp('dashboard') },
    { label: 'إغلاق اليوم', icon: FileCheck, path: '/daily-close', show: true },
    {
      label: 'المخزون',
      icon: Package,
      key: 'inventory',
      children: [
        { label: 'كل المنتجات', path: '/inventory', perm: 'inventory' as PermissionKey },
        { label: 'إضافة منتج', path: '/inventory/add', perm: 'inventory_add' as PermissionKey },
        { label: 'نقل المنتجات', path: '/inventory/transfer', perm: 'inventory' as PermissionKey },
        { label: 'تنبيهات المخزون', path: '/inventory/warnings', perm: 'inventory_warnings' as PermissionKey },
        { label: 'إدارة الأصناف', path: '/inventory/categories', perm: 'inventory_categories' as PermissionKey },
        { label: 'إدارة الألوان', path: '/inventory/colors', perm: 'inventory_categories' as PermissionKey },
        { label: 'إدارة الوحدات', path: '/inventory/units', perm: 'inventory_categories' as PermissionKey },
      ],
      show: hp('inventory') || hp('inventory_add') || hp('inventory_warnings') || hp('inventory_categories'),
    },
    {
      label: 'المبيعات',
      icon: ShoppingCart,
      key: 'sales',
      children: [
        { label: 'فاتورة جديدة', path: '/sales/new', perm: 'sales_create' as PermissionKey },
        { label: 'كل الفواتير', path: '/sales/invoices', perm: 'sales' as PermissionKey },
      ],
      show: hp('sales') || hp('sales_create'),
    },
    {
      label: 'الزباين',
      icon: Users,
      key: 'customers',
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
      key: 'projects',
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
      key: 'reports',
      children: [
        { label: 'تقرير اليوم', path: '/reports/daily', perm: 'reports' as PermissionKey },
        { label: 'تقرير الأسبوع', path: '/reports/weekly', perm: 'reports' as PermissionKey },
        { label: 'الأرباح', path: '/reports/profits', perm: 'reports_profits' as PermissionKey },
      ],
      show: hp('reports') || hp('reports_profits'),
    },
    {
      label: 'الإعدادات',
      icon: Settings,
      key: 'admin',
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

  const toggleMenu = (key: string) => {
    setExpandedMenus((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white shadow-sm z-50 flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 touch-manipulation"
          aria-label="فتح القائمة"
        >
          <Menu size={24} className="text-gray-700" />
        </button>
        <Link to="/" className="flex items-center">
          <Logo variant="full" size="sm" theme="light" />
        </Link>
        <button
          onClick={() => setNotificationsOpen(!notificationsOpen)}
          className="relative p-2 rounded-lg hover:bg-gray-100 touch-manipulation"
        >
          <Bell size={22} className="text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </header>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed right-0 top-0 h-full bg-sidebar-bg text-sidebar-text z-50 transition-transform duration-300 ease-in-out',
          'w-72 lg:w-64',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
          sidebarCollapsed && 'lg:w-20'
        )}
      >
        {/* Logo & Close */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-hover h-16 lg:h-auto">
          <Link to="/" className="flex items-center gap-3">
            {sidebarCollapsed && !sidebarOpen ? (
              <Logo variant="icon" size="sm" theme="dark" />
            ) : (
              <Logo variant="full" size="sm" theme="dark" />
            )}
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:block p-2 rounded-lg hover:bg-sidebar-hover"
              aria-label={sidebarCollapsed ? 'توسيع' : 'تصغير'}
            >
              {sidebarCollapsed ? <ChevronLeft size={20} /> : <ChevronDown size={20} />}
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-sidebar-hover"
              aria-label="إغلاق"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-140px)] lg:h-[calc(100vh-180px)]">
          {navItems
            .filter((item) => item.show)
            .map((item) => (
              <div key={item.label}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleMenu(item.key!)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-lg transition-colors touch-manipulation',
                        isParentActive(item.children)
                          ? 'bg-sidebar-active text-gold-500'
                          : 'hover:bg-sidebar-hover'
                      )}
                    >
                      <item.icon size={22} className="flex-shrink-0" />
                      {(!sidebarCollapsed || sidebarOpen) && (
                        <>
                          <span className="flex-1 text-right">{item.label}</span>
                          <ChevronDown
                            size={16}
                            className={clsx(
                              'transition-transform',
                              expandedMenus.includes(item.key!) && 'rotate-180'
                            )}
                          />
                        </>
                      )}
                    </button>
                    {(!sidebarCollapsed || sidebarOpen) && expandedMenus.includes(item.key!) && (
                      <div className="mr-3 mt-1 space-y-1">
                        {item.children
                          .filter((child) => !child.perm || hp(child.perm))
                          .map((child) => (
                            <Link
                              key={child.path}
                              to={child.path}
                              className={clsx(
                                'block px-3 py-3 lg:py-2 rounded-lg text-sm transition-colors touch-manipulation',
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
                      'flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-lg transition-colors touch-manipulation',
                      isActive(item.path!)
                        ? 'bg-gold-500 text-sidebar-bg font-semibold'
                        : 'hover:bg-sidebar-hover'
                    )}
                  >
                    <item.icon size={22} className="flex-shrink-0" />
                    {(!sidebarCollapsed || sidebarOpen) && <span>{item.label}</span>}
                  </Link>
                )}
              </div>
            ))}
        </nav>

        {/* User info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-sidebar-hover bg-sidebar-bg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sidebar-hover flex items-center justify-center flex-shrink-0">
              <User size={20} />
            </div>
            {(!sidebarCollapsed || sidebarOpen) && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate text-sm">{user?.name}</p>
                  <p className="text-xs text-gray-400">
                    {user?.role === 'ADMIN' && 'مدير النظام'}
                    {user?.role === 'EMPLOYEE' && 'موظف'}
                    {user?.role === 'CRAFTSMAN' && 'صنايعي'}
                    {user?.role === 'PROJECT_MANAGER' && 'مدير مشاريع'}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-sidebar-hover text-gray-400 touch-manipulation"
                  aria-label="تسجيل الخروج"
                >
                  <LogOut size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={clsx(
          'transition-all duration-300 min-h-screen',
          'pt-16 lg:pt-0',
          'mr-0 lg:mr-64',
          sidebarCollapsed && 'lg:mr-20'
        )}
      >
        {/* Desktop Top bar */}
        <header className="hidden lg:block bg-white shadow-sm px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-800 truncate">
              {user?.warehouse?.name || 'Magic - نظام إدارة الديكور'}
            </h1>
            <div className="flex items-center gap-4">
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
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile Notification Dropdown */}
      {notificationsOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setNotificationsOpen(false)}
        >
          <div
            className="absolute top-16 left-4 right-4 bg-white rounded-xl shadow-xl max-h-[70vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <NotificationDropdown onClose={() => setNotificationsOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

const NotificationDropdown: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { notifications, markAsRead } = useNotificationStore();
  const recentNotifications = notifications.slice(0, 5);

  return (
    <>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold">الإشعارات</h3>
        <button
          onClick={onClose}
          className="lg:hidden p-1 rounded hover:bg-gray-100"
        >
          <X size={18} />
        </button>
      </div>

      {recentNotifications.length === 0 ? (
        <div className="p-6 text-center text-gray-500">لا توجد إشعارات</div>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          {recentNotifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => {
                markAsRead(notification.id);
                onClose();
              }}
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
    </>
  );
};

export default Layout;
