import React, { useEffect, useState } from 'react';
import { Printer, Calendar, Building2, User, DollarSign, CreditCard, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { Warehouse, User as UserType } from '../../types';
import toast from 'react-hot-toast';

interface DaySummary {
  date: string;
  paid: number;
  pending: number;
  credit: number;
  expenses: number;
  netCash: number;
  invoiceCount: number;
}

const WeeklyReportPage: React.FC = () => {
  const { user } = useAuthStore();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [employees, setEmployees] = useState<UserType[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<{
    days: DaySummary[];
    totalPaid: number;
    totalPending: number;
    totalCredit: number;
    totalExpenses: number;
    totalNet: number;
    totalInvoices: number;
  } | null>(null);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (user?.warehouse_id) setSelectedWarehouse(user.warehouse_id);
  }, [user]);

  useEffect(() => {
    if (selectedWarehouse) fetchEmployees();
  }, [selectedWarehouse]);

  useEffect(() => {
    if (selectedWarehouse && weekStart) generateReport();
  }, [selectedWarehouse, weekStart, selectedEmployee]);

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name');
    setWarehouses(data || []);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('warehouse_id', selectedWarehouse)
      .eq('role', 'EMPLOYEE')
      .eq('is_active', true);
    setEmployees(data || []);
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const start = new Date(weekStart);
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 7);

      let invoiceQuery = supabase
        .from('invoices')
        .select('*')
        .eq('warehouse_id', selectedWarehouse)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString());

      let expenseQuery = supabase
        .from('expenses')
        .select('*')
        .eq('warehouse_id', selectedWarehouse)
        .gte('expense_date', weekStart)
        .lt('expense_date', end.toISOString().split('T')[0]);

      if (selectedEmployee) {
        invoiceQuery = invoiceQuery.eq('employee_id', selectedEmployee);
        expenseQuery = expenseQuery.eq('employee_id', selectedEmployee);
      }

      const [{ data: invoices }, { data: expenses }] = await Promise.all([invoiceQuery, expenseQuery]);

      const days: DaySummary[] = [];
      let totalPaid = 0, totalPending = 0, totalCredit = 0, totalExpenses = 0, totalInvoices = 0;

      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];

        const dayInvoices = (invoices || []).filter((inv) => inv.created_at.startsWith(dateStr));
        const dayExpenses = (expenses || []).filter((exp) => exp.expense_date === dateStr);

        const paid = dayInvoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + Number(i.net_amount), 0);
        const pending = dayInvoices.filter((i) => i.status === 'PENDING').reduce((s, i) => s + Number(i.net_amount), 0);
        const credit = dayInvoices.filter((i) => i.status === 'CREDIT').reduce((s, i) => s + Number(i.net_amount), 0);
        const exp = dayExpenses.reduce((s, e) => s + Number(e.amount), 0);

        days.push({
          date: dateStr,
          paid,
          pending,
          credit,
          expenses: exp,
          netCash: paid - exp,
          invoiceCount: dayInvoices.length,
        });

        totalPaid += paid;
        totalPending += pending;
        totalCredit += credit;
        totalExpenses += exp;
        totalInvoices += dayInvoices.length;
      }

      setReport({
        days,
        totalPaid,
        totalPending,
        totalCredit,
        totalExpenses,
        totalNet: totalPaid - totalExpenses,
        totalInvoices,
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error('حدث خطأ أثناء إنشاء التقرير');
    } finally {
      setLoading(false);
    }
  };

  const warehouse = warehouses.find((w) => w.id === selectedWarehouse);
  const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">تقرير الأسبوع</h1>
          <p className="text-gray-500 mt-1">ملخص أسبوعي للمبيعات والمصروفات</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          <Printer size={18} />
          طباعة
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-card p-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building2 size={14} className="inline ml-1" />
              المخزن
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => { setSelectedWarehouse(e.target.value); setSelectedEmployee(''); }}
              disabled={!!user?.warehouse_id}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User size={14} className="inline ml-1" />
              الموظف
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
            >
              <option value="">جميع الموظفين</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={14} className="inline ml-1" />
              بداية الأسبوع
            </label>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
            />
          </div>
        </div>
      </div>

      {/* Report */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <div className="spinner mx-auto" />
          <p className="text-gray-500 mt-4">جاري إنشاء التقرير...</p>
        </div>
      ) : report ? (
        <div className="bg-white rounded-xl shadow-card print-report" id="report-print">
          {/* Summary header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  تقرير أسبوع: {weekStart} إلى {(() => {
                    const e = new Date(weekStart);
                    e.setDate(e.getDate() + 6);
                    return e.toISOString().split('T')[0];
                  })()}
                </h2>
                {warehouse && <p className="text-gray-500">مخزن: {warehouse.name}</p>}
              </div>
              <div className="text-sm text-gray-500">إجمالي الفواتير: {report.totalInvoices}</div>
            </div>
          </div>

          {/* Weekly totals */}
          <div className="p-6 bg-gray-50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-lg border-2 border-gold-200">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign size={18} className="text-gold-600" />
                  <span className="text-sm text-gray-600">إجمالي الكاش</span>
                </div>
                <p className="text-2xl font-bold text-gold-600">{report.totalPaid.toFixed(3)} د.أ</p>
              </div>

              <div className="p-4 bg-white rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard size={18} className="text-red-500" />
                  <span className="text-sm text-gray-600">المصروفات</span>
                </div>
                <p className="text-2xl font-bold text-red-600">-{report.totalExpenses.toFixed(3)} د.أ</p>
              </div>

              <div className="p-4 bg-gold-500 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={18} className="text-gray-900" />
                  <span className="text-sm text-gray-800">صافي الكاش</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{report.totalNet.toFixed(3)} د.أ</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-between p-3 bg-white rounded-lg text-sm">
                <span className="text-gray-600">فواتير معلقة</span>
                <span className="font-semibold text-amber-600">{report.totalPending.toFixed(3)} د.أ</span>
              </div>
              <div className="flex justify-between p-3 bg-white rounded-lg text-sm">
                <span className="text-gray-600">فواتير دائن</span>
                <span className="font-semibold text-orange-600">{report.totalCredit.toFixed(3)} د.أ</span>
              </div>
            </div>
          </div>

          {/* Daily breakdown */}
          <div className="p-6">
            <h3 className="font-semibold text-gray-800 mb-4">التفاصيل اليومية</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">اليوم</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">التاريخ</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">الفواتير</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">مدفوع</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">معلق</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">دائن</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">مصروفات</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">صافي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.days.map((day) => {
                    const d = new Date(day.date);
                    return (
                      <tr key={day.date} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{dayNames[d.getDay()]}</td>
                        <td className="px-4 py-3 text-gray-600">{day.date}</td>
                        <td className="px-4 py-3">{day.invoiceCount}</td>
                        <td className="px-4 py-3 text-green-600 font-medium">{day.paid.toFixed(3)}</td>
                        <td className="px-4 py-3 text-amber-600">{day.pending.toFixed(3)}</td>
                        <td className="px-4 py-3 text-orange-600">{day.credit.toFixed(3)}</td>
                        <td className="px-4 py-3 text-red-600">{day.expenses.toFixed(3)}</td>
                        <td className="px-4 py-3 font-bold">{day.netCash.toFixed(3)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr className="font-bold">
                    <td className="px-4 py-3" colSpan={2}>المجموع</td>
                    <td className="px-4 py-3">{report.totalInvoices}</td>
                    <td className="px-4 py-3 text-green-600">{report.totalPaid.toFixed(3)}</td>
                    <td className="px-4 py-3 text-amber-600">{report.totalPending.toFixed(3)}</td>
                    <td className="px-4 py-3 text-orange-600">{report.totalCredit.toFixed(3)}</td>
                    <td className="px-4 py-3 text-red-600">{report.totalExpenses.toFixed(3)}</td>
                    <td className="px-4 py-3 text-gold-600">{report.totalNet.toFixed(3)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WeeklyReportPage;
