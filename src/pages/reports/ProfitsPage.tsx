import React, { useEffect, useState } from 'react';
import { TrendingUp, Calendar, DollarSign, Package, ArrowUpRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import clsx from 'clsx';

interface ProfitInvoice {
  invoice_id: string;
  invoice_number: string;
  date: string;
  total_revenue: number;
  total_cost: number;
  profit: number;
  customer_name: string;
}

interface TopProduct {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
}

const ProfitsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [invoices, setInvoices] = useState<ProfitInvoice[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  useEffect(() => {
    fetchProfits();
  }, [period, customStart, customEnd]);

  const getDateRange = () => {
    const today = new Date();
    let start: string;
    let end: string = today.toISOString().split('T')[0];

    switch (period) {
      case 'today':
        start = end;
        break;
      case 'week': {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        start = weekAgo.toISOString().split('T')[0];
        break;
      }
      case 'month': {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        start = monthAgo.toISOString().split('T')[0];
        break;
      }
      case 'custom':
        start = customStart || end;
        end = customEnd || end;
        break;
      default:
        start = end;
    }
    return { start, end };
  };

  const fetchProfits = async () => {
    if (!user) return;
    if (period === 'custom' && (!customStart || !customEnd)) return;

    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const { data, error } = await supabase.rpc('get_profits_report', {
        p_user_id: user.id,
        p_start_date: start,
        p_end_date: end,
      });

      if (error) throw error;
      if (!data?.success) return;

      setTotalRevenue(Number(data.total_revenue) || 0);
      setTotalCost(Number(data.total_cost) || 0);
      setTotalProfit(Number(data.total_profit) || 0);
      setInvoices(data.invoices || []);
      setTopProducts(data.top_products || []);
    } catch (error) {
      console.error('Error fetching profits:', error);
    } finally {
      setLoading(false);
    }
  };

  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">تقرير الأرباح</h1>
        <p className="text-gray-500 mt-1">تحليل أرباح المبيعات والمنتجات الأكثر ربحاً</p>
      </div>

      {/* Period selector */}
      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {[
              { key: 'today', label: 'اليوم' },
              { key: 'week', label: 'الأسبوع' },
              { key: 'month', label: 'الشهر' },
              { key: 'custom', label: 'فترة مخصصة' },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key as typeof period)}
                className={clsx(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  period === p.key ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-1 focus:ring-gold-200 text-sm"
              />
              <span className="text-gray-400">—</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-1 focus:ring-gold-200 text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">إجمالي المبيعات</p>
              <p className="text-xl font-bold text-gray-800 mt-1">{totalRevenue.toFixed(2)} د.أ</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500 text-white">
              <DollarSign size={22} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">تكلفة البضاعة</p>
              <p className="text-xl font-bold text-gray-800 mt-1">{totalCost.toFixed(2)} د.أ</p>
            </div>
            <div className="p-3 rounded-xl bg-red-500 text-white">
              <Package size={22} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">صافي الربح</p>
              <p className={clsx('text-xl font-bold mt-1', totalProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
                {totalProfit.toFixed(2)} د.أ
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-600 text-white">
              <TrendingUp size={22} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">نسبة الربح</p>
              <p className="text-xl font-bold text-gray-800 mt-1">{profitMargin}%</p>
            </div>
            <div className="p-3 rounded-xl bg-gold-500 text-gray-900">
              <ArrowUpRight size={22} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top products */}
        <div className="bg-white rounded-xl shadow-card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">أكثر المنتجات ربحاً</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-12 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : topProducts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">لا توجد بيانات للفترة المحددة</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-gold-100 text-gold-700 flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{p.product_name}</p>
                      <p className="text-xs text-gray-500">الكمية: {Number(p.total_quantity).toFixed(0)}</p>
                    </div>
                  </div>
                  <span className={clsx('font-bold text-sm', Number(p.total_profit) >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {Number(p.total_profit).toFixed(2)} د.أ
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent invoices with profit */}
        <div className="bg-white rounded-xl shadow-card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">الفواتير والأرباح</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-12 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-gray-500 text-center py-8">لا توجد فواتير للفترة المحددة</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {invoices.slice(0, 20).map((inv) => (
                <div key={inv.invoice_id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-500">{inv.customer_name} - {new Date(inv.date).toLocaleDateString('ar-EG')}</p>
                  </div>
                  <div className="text-left">
                    <p className={clsx('font-bold text-sm', Number(inv.profit) >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {Number(inv.profit).toFixed(2)} د.أ
                    </p>
                    <p className="text-xs text-gray-400">من {Number(inv.total_revenue).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfitsPage;
