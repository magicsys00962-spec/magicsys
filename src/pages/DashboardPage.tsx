import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  FileText,
  AlertTriangle,
  Clock,
  ShoppingCart,
  Users,
  Wrench,
  Package,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore, isAdmin, isEmployee, isProjectManager } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import type { DashboardStats } from '../types';
import clsx from 'clsx';

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    total_sales_today: 0,
    pending_invoices: 0,
    overdue_credit: 0,
    low_stock_count: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, [user]);

  const fetchDashboardStats = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Get warehouse filter for non-admin
      const warehouseFilter = user.warehouse_id
        ? `warehouse_id=eq.${user.warehouse_id}`
        : '';
      void warehouseFilter;

      // Fetch total sales today
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('net_amount')
        .eq('status', 'PAID')
        .gte('created_at', today)
        .order('created_at', { ascending: false });

      const totalSales = paidInvoices?.reduce((sum, inv) => sum + Number(inv.net_amount), 0) || 0;

      // Fetch daily profit
      let dailyProfit = 0;
      if (isAdmin(user) || user?.permissions?.reports_profits) {
        const { data: profitData } = await supabase.rpc('get_profits_report', {
          p_user_id: user.id,
          p_start_date: today,
          p_end_date: today,
        });
        if (profitData?.success) {
          dailyProfit = Number(profitData.total_profit) || 0;
        }
      }

      // Fetch pending invoices count
      const { count: pendingCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING');

      // Fetch overdue credit count
      const { count: overdueCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('credit_overdue', true);

      // Fetch low stock count
      let lowStockQuery = supabase
        .from('products')
        .select('id', { count: 'exact', head: true });

      if (user.warehouse_id) {
        lowStockQuery = lowStockQuery.filter(
          'quantity_in_stock',
          'lte',
          'reorder_level'
        ).eq('warehouse_id', user.warehouse_id);
      } else {
        lowStockQuery = lowStockQuery.filter(
          'quantity_in_stock',
          'lte',
          'reorder_level'
        );
      }

      // For project manager, fetch additional stats
      let activeProjects = 0;
      let pendingInspections = 0;

      if (isProjectManager(user)) {
        const { count: projectsCount } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('project_manager_id', user.id)
          .eq('status', 'IN_PROGRESS');

        activeProjects = projectsCount || 0;

        const { count: inspectionsCount } = await supabase
          .from('inspection_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING');

        pendingInspections = inspectionsCount || 0;
      }

      setStats({
        total_sales_today: totalSales,
        pending_invoices: pendingCount || 0,
        overdue_credit: overdueCount || 0,
        low_stock_count: 0,
        daily_profit: dailyProfit,
        active_projects: activeProjects,
        pending_inspections: pendingInspections,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickLinks = [
    {
      label: 'فاتورة جديدة',
      path: '/sales/new',
      icon: ShoppingCart,
      color: 'bg-green-500',
      show: !isProjectManager(user),
    },
    {
      label: 'إضافة منتج',
      path: '/inventory/add',
      icon: Package,
      color: 'bg-blue-500',
      show: isAdmin(user) || isEmployee(user),
    },
    {
      label: 'مشروع جديد',
      path: '/projects/new',
      icon: Wrench,
      color: 'bg-purple-500',
      show: isProjectManager(user),
    },
    {
      label: 'إضافة زبون',
      path: '/customers/add',
      icon: Users,
      color: 'bg-amber-500',
      show: !isProjectManager(user),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome header */}
      <div className="bg-gradient-to-l from-gold-500 to-gold-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">مرحباً، {user?.name}!</h1>
        <p className="text-gold-100 mt-1">
          {user?.role === 'ADMIN' && 'لديك صلاحيات كاملة على النظام'}
          {user?.role === 'EMPLOYEE' && `مرحباً بك في ${user?.warehouse?.name || 'المخزن'}`}
          {user?.role === 'PROJECT_MANAGER' && 'مرحباً بك في قسم التنفيذ'}
          {user?.role === 'CRAFTSMAN' && 'مرحباً بك في حسابك'}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="مبيعات اليوم"
          value={`${stats.total_sales_today.toFixed(3)} د.أ`}
          icon={DollarSign}
          color="bg-green-500"
          loading={loading}
        />
        <StatCard
          title="فواتير معلقة"
          value={stats.pending_invoices.toString()}
          icon={Clock}
          color="bg-amber-500"
          loading={loading}
        />
        <StatCard
          title="فواتير متأخرة"
          value={stats.overdue_credit.toString()}
          icon={AlertTriangle}
          color="bg-red-500"
          loading={loading}
        />
        {!isProjectManager(user) && (
          <StatCard
            title="منتجات قليلة المخزون"
            value={stats.low_stock_count.toString()}
            icon={Package}
            color="bg-orange-500"
            loading={loading}
          />
        )}
        {(isAdmin(user) || user?.permissions?.reports_profits) && (
          <StatCard
            title="أرباح اليوم"
            value={`${(stats.daily_profit || 0).toFixed(2)} د.أ`}
            icon={TrendingUp}
            color="bg-emerald-600"
            loading={loading}
          />
        )}
      </div>

      {/* Project manager specific stats */}
      {isProjectManager(user) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            title="مشاريع نشطة"
            value={stats.active_projects?.toString() || '0'}
            icon={Wrench}
            color="bg-purple-500"
            loading={loading}
          />
          <StatCard
            title="طلبات كشف معلقة"
            value={stats.pending_inspections?.toString() || '0'}
            icon={FileText}
            color="bg-blue-500"
            loading={loading}
          />
        </div>
      )}

      {/* Quick links */}
      <div className="bg-white rounded-xl shadow-card p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">روابط سريعة</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {!isProjectManager(user) && (
            <Link
              to="/sales/new"
              className="flex items-center gap-3 p-5 rounded-xl bg-green-500 hover:bg-green-600 transition-all shadow-md hover:shadow-lg text-white"
            >
              <div className="p-2 bg-white/20 rounded-lg">
                <ShoppingCart size={24} />
              </div>
              <div>
                <p className="font-bold text-base">فاتورة جديدة</p>
                <p className="text-xs text-green-100">إنشاء فاتورة بيع</p>
              </div>
            </Link>
          )}
          {quickLinks
            .filter((link) => link.show && link.path !== '/sales/new')
            .map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className={clsx('p-2 rounded-lg text-white', link.color)}>
                  <link.icon size={20} />
                </div>
                <span className="font-medium text-gray-700">{link.label}</span>
              </Link>
            ))}
        </div>
      </div>

      {/* Recent activity */}
      <RecentActivity />
    </div>
  );
};

const StatCard: React.FC<{
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}> = ({ title, value, icon: Icon, color, loading }) => (
  <div className="bg-white rounded-xl shadow-card p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        {loading ? (
          <div className="h-8 w-20 bg-gray-200 animate-pulse rounded mt-1" />
        ) : (
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        )}
      </div>
      <div className={clsx('p-3 rounded-xl text-white', color)}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

const RecentActivity: React.FC = () => {
  const { user } = useAuthStore();
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentInvoices();
  }, [user]);

  const fetchRecentInvoices = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(name),
          warehouse:warehouses(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (user.warehouse_id && user.role === 'EMPLOYEE') {
        query = query.eq('warehouse_id', user.warehouse_id);
      }

      const { data } = await query;
      setRecentInvoices(data || []);
    } catch (error) {
      console.error('Error fetching recent invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
        return 'bg-amber-100 text-amber-700';
      case 'CREDIT':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'مدفوعة';
      case 'PENDING':
        return 'معلقة';
      case 'CREDIT':
        return 'دائن';
      default:
        return status;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">آخر الفواتير</h2>
        <Link
          to="/sales/invoices"
          className="text-gold-600 hover:text-gold-700 font-medium text-sm"
        >
          عرض الكل
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex gap-4">
              <div className="h-12 w-12 bg-gray-200 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : recentInvoices.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          لا توجد فواتير حتى الآن
        </div>
      ) : (
        <div className="space-y-3">
          {recentInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center">
                  <FileText size={18} className="text-gold-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">{invoice.invoice_number}</p>
                  <p className="text-sm text-gray-500">
                    {invoice.customer?.name || 'زبون عابر'}
                  </p>
                </div>
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-800">
                  {invoice.net_amount.toFixed(3)} د.أ
                </p>
                <span
                  className={clsx(
                    'text-xs px-2 py-1 rounded-full',
                    getStatusColor(invoice.status)
                  )}
                >
                  {getStatusLabel(invoice.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
