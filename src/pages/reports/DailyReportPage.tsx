import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
import { Printer, Calendar, Building2, User, DollarSign, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { Invoice, Warehouse, DailyExpense, User as UserType } from '../../types';
import Logo from '../../components/Logo';
import toast from 'react-hot-toast';

const DailyReportPage: React.FC = () => {
  const { user } = useAuthStore();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [employees, setEmployees] = useState<UserType[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<{
    paidInvoices: Invoice[];
    pendingInvoices: Invoice[];
    creditInvoices: Invoice[];
    expenses: DailyExpense[];
    totalPaid: number;
    totalPending: number;
    totalCredit: number;
    totalExpenses: number;
    netCash: number;
  } | null>(null);

  useEffect(() => {
    fetchWarehouses();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (user?.warehouse_id) {
      setSelectedWarehouse(user.warehouse_id);
    }
  }, [user]);

  useEffect(() => {
    if (selectedWarehouse && selectedDate) {
      generateReport();
    }
  }, [selectedWarehouse, selectedDate, selectedEmployee]);

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name');
    setWarehouses(data || []);
  };

  const fetchEmployees = async () => {
    if (selectedWarehouse) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('warehouse_id', selectedWarehouse)
        .eq('role', 'EMPLOYEE')
        .eq('is_active', true);
      setEmployees(data || []);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const dateFrom = new Date(selectedDate);
      dateFrom.setHours(0, 0, 0, 0);
      const dateTo = new Date(selectedDate);
      dateTo.setHours(23, 59, 59, 999);

      let invoiceQuery = supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(name)
        `)
        .eq('warehouse_id', selectedWarehouse)
        .gte('created_at', dateFrom.toISOString())
        .lte('created_at', dateTo.toISOString());

      let expenseQuery = supabase
        .from('expenses')
        .select('*')
        .eq('warehouse_id', selectedWarehouse)
        .eq('expense_date', selectedDate);

      if (selectedEmployee) {
        invoiceQuery = invoiceQuery.eq('employee_id', selectedEmployee);
        expenseQuery = expenseQuery.eq('employee_id', selectedEmployee);
      }

      const [{ data: invoices }, { data: expenses }] = await Promise.all([
        invoiceQuery,
        expenseQuery,
      ]);

      const paidInvoices = invoices?.filter((i) => i.status === 'PAID') || [];
      const pendingInvoices = invoices?.filter((i) => i.status === 'PENDING') || [];
      const creditInvoices = invoices?.filter((i) => i.status === 'CREDIT') || [];

      const totalPaid = paidInvoices.reduce((sum, i) => sum + Number(i.net_amount), 0);
      const totalPending = pendingInvoices.reduce((sum, i) => sum + Number(i.net_amount), 0);
      const totalCredit = creditInvoices.reduce((sum, i) => sum + Number(i.net_amount), 0);
      const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      setReport({
        paidInvoices,
        pendingInvoices,
        creditInvoices,
        expenses: expenses || [],
        totalPaid,
        totalPending,
        totalCredit,
        totalExpenses,
        netCash: totalPaid - totalExpenses,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('حدث خطأ أثناء إنشاء التقرير');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const warehouse = warehouses.find((w) => w.id === selectedWarehouse);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">تقرير نهاية اليوم</h1>
          <p className="text-gray-500 mt-1">تقرير يومي للمبيعات والمصروفات</p>
        </div>
        <button
          onClick={handlePrint}
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
              onChange={(e) => {
                setSelectedWarehouse(e.target.value);
                setSelectedEmployee('');
              }}
              disabled={!!user?.warehouse_id}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
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
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={14} className="inline ml-1" />
              التاريخ
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
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
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-800">تقرير يوم: {selectedDate}</h2>
                {warehouse && (
                  <p className="text-gray-500">مخزن: {warehouse.name}</p>
                )}
                {selectedEmployee && (
                  <p className="text-sm text-gray-500">
                    الموظف: {employees.find((e) => e.id === selectedEmployee)?.name}
                  </p>
                )}
              </div>
              <Logo variant="icon" size="sm" theme="light" className="no-print" />
            </div>
          </div>

          {/* Summary */}
          <div className="p-6 bg-gray-50 space-y-4">
            {/* Total Sales */}
            <div className="flex justify-between items-center p-4 bg-white rounded-lg border-2 border-gold-200">
              <div className="flex items-center gap-3">
                <DollarSign className="text-gold-600" size={24} />
                <span className="font-semibold text-gray-800">إجمالي المبيعات الكلية (كاش)</span>
              </div>
              <span className="text-2xl font-bold text-gold-600">
                {report.totalPaid.toFixed(3)} د.أ
              </span>
            </div>

            {/* Breakdown */}
            <div className="mr-8 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>├── فواتير مدفوعة ({report.paidInvoices.length})</span>
                <span className="font-semibold">{report.totalPaid.toFixed(3)} د.أ</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>├── فواتير معلقة ({report.pendingInvoices.length})</span>
                <span className="font-semibold text-amber-600">{report.totalPending.toFixed(3)} د.أ</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>└── فواتير دائن ({report.creditInvoices.length})</span>
                <span className="font-semibold text-orange-600">{report.totalCredit.toFixed(3)} د.أ</span>
              </div>
            </div>

            {/* Expenses */}
            <div className="flex justify-between items-center p-4 bg-white rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="text-red-500" size={24} />
                <span className="font-semibold text-gray-800">المصروفات العامة</span>
              </div>
              <span className="text-xl font-bold text-red-600">
                -{report.totalExpenses.toFixed(3)} د.أ
              </span>
            </div>

            {/* Expenses breakdown */}
            {report.expenses.length > 0 && (
              <div className="mr-8 space-y-1">
                {report.expenses.map((exp) => (
                  <div key={exp.id} className="flex justify-between text-gray-600 text-sm">
                    <span>├── {exp.name}</span>
                    <span>{exp.amount.toFixed(3)} د.أ</span>
                  </div>
                ))}
              </div>
            )}

            {/* Net Cash */}
            <div className="flex justify-between items-center p-4 bg-gold-500 rounded-lg">
              <div className="flex items-center gap-3">
                <DollarSign className="text-gray-900" size={24} />
                <span className="font-bold text-gray-900">صافي الكاش (بعد المصروفات)</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {report.netCash.toFixed(3)} د.أ
              </span>
            </div>
          </div>

          {/* Invoice details */}
          {report.paidInvoices.length > 0 && (
            <div className="p-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4">تفاصيل الفواتير المدفوعة</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-right">رقم الفاتورة</th>
                      <th className="px-4 py-2 text-right">الزبون</th>
                      <th className="px-4 py-2 text-right">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.paidInvoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="px-4 py-2 font-mono">{inv.invoice_number}</td>
                        <td className="px-4 py-2">{inv.customer?.name || 'زبون عابر'}</td>
                        <td className="px-4 py-2 font-semibold">{inv.net_amount.toFixed(3)} د.أ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default DailyReportPage;
