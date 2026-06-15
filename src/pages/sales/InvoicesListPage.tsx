import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Eye,
  Printer,
  ChevronDown,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  CreditCard,
  Receipt,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { Invoice } from '../../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface Expense {
  id: string;
  warehouse_id: string;
  employee_id: string | null;
  name: string;
  amount: number;
  expense_date: string;
  notes: string | null;
  created_at: string;
  employee_name?: string | null;
}

const InvoicesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'invoices' | 'expenses'>('invoices');

  // --- Invoices state ---
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // --- Expenses state ---
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [expenseDateFrom, setExpenseDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [expenseDateTo, setExpenseDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    name: '',
    amount: '',
    notes: '',
  });

  useEffect(() => {
    if (activeTab === 'invoices') fetchInvoices();
    else fetchExpenses();
  }, [activeTab, search, statusFilter, dateFrom, dateTo, user]);

  useEffect(() => {
    if (activeTab === 'expenses') fetchExpenses();
  }, [expenseDateFrom, expenseDateTo]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(id, name, phone, type),
          employee:users(id, name),
          warehouse:warehouses(id, name, code)
        `)
        .order('created_at', { ascending: false });

      if (user?.warehouse_id && user.role === 'EMPLOYEE') {
        query = query.eq('warehouse_id', user.warehouse_id);
      }
      if (statusFilter) query = query.eq('status', statusFilter);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setDate(toDate.getDate() + 1);
        query = query.lt('created_at', toDate.toISOString());
      }
      if (search) query = query.or(`invoice_number.ilike.%${search}%`);

      const { data, error } = await query.limit(100);
      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateFrom, dateTo, user]);

  const fetchExpenses = async () => {
    if (!user?.warehouse_id || !user?.id) return;
    setExpensesLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_expenses', {
        p_user_id: user.id,
        p_warehouse_id: user.warehouse_id,
        p_date_from: expenseDateFrom || null,
        p_date_to: expenseDateTo || null,
      });
      if (error) throw error;
      if (data?.success) {
        setExpenses(data.expenses || []);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setExpensesLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.name.trim()) {
      toast.error('اسم المصروف مطلوب');
      return;
    }
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
      toast.error('المبلغ يجب أن يكون أكبر من صفر');
      return;
    }
    if (!user?.warehouse_id || !user?.id) {
      toast.error('يجب تعيين مخزن للحساب');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('add_expense', {
        p_user_id: user.id,
        p_warehouse_id: user.warehouse_id,
        p_name: expenseForm.name.trim(),
        p_amount: Number(expenseForm.amount),
        p_expense_date: new Date().toISOString().split('T')[0],
        p_notes: expenseForm.notes.trim() || null,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'فشل الحفظ');

      toast.success('تمت إضافة المصروف');
      setShowAddExpense(false);
      setExpenseForm({ name: '', amount: '', notes: '' });
      fetchExpenses();
    } catch (error: unknown) {
      console.error('Error adding expense:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!user?.id) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
    try {
      const { data, error } = await supabase.rpc('delete_expense', {
        p_user_id: user.id,
        p_expense_id: id,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message);
      toast.success('تم الحذف');
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (error: unknown) {
      console.error('Error deleting expense:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ');
    }
  };

  const getStatusConfig = (status: string, overdue?: boolean) => {
    if (status === 'PAID') return { label: 'مدفوعة', icon: CheckCircle, color: 'bg-green-100 text-green-700' };
    if (status === 'PENDING') return { label: 'معلقة', icon: Clock, color: 'bg-amber-100 text-amber-700' };
    if (status === 'CREDIT') {
      if (overdue) return { label: 'متأخرة', icon: AlertTriangle, color: 'bg-red-100 text-red-700' };
      return { label: 'دائن', icon: CreditCard, color: 'bg-orange-100 text-orange-700' };
    }
    return { label: status, icon: FileText, color: 'bg-gray-100 text-gray-700' };
  };

  const totalExpensesAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">المبيعات</h1>
          <p className="text-gray-500 mt-1">الفواتير والمصاريف</p>
        </div>
        {activeTab === 'invoices' ? (
          <Link
            to="/sales/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors"
          >
            <FileText size={20} />
            فاتورة جديدة
          </Link>
        ) : (
          <button
            onClick={() => setShowAddExpense(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors"
          >
            <Plus size={20} />
            إضافة مصروف
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('invoices')}
          className={clsx(
            'flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'invoices'
              ? 'border-gold-500 text-gold-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <FileText size={16} />
          الفواتير
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={clsx(
            'flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'expenses'
              ? 'border-gold-500 text-gold-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <Receipt size={16} />
          المصاريف
        </button>
      </div>

      {/* ===== INVOICES TAB ===== */}
      {activeTab === 'invoices' && (
        <>
          {/* Search and filters */}
          <div className="bg-white rounded-xl shadow-card p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث برقم الفاتورة..."
                  className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-300"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors',
                  showFilters ? 'border-gold-500 bg-gold-50 text-gold-700' : 'border-gray-300 hover:bg-gray-50'
                )}
              >
                <Filter size={20} />
                فلاتر
                <ChevronDown size={16} className={clsx('transition-transform', showFilters && 'rotate-180')} />
              </button>
            </div>
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300">
                    <option value="">كل الحالات</option>
                    <option value="PAID">مدفوعة</option>
                    <option value="PENDING">معلقة</option>
                    <option value="CREDIT">دائن</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-300" />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="spinner mx-auto" />
                <p className="text-gray-500 mt-4">جاري التحميل...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-12 text-center">
                <FileText size={48} className="mx-auto text-gray-300" />
                <p className="text-gray-500 mt-4">لا توجد فواتير</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">رقم الفاتورة</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">التاريخ</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">الزبون</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">المبلغ</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">المخزن</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">الحالة</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoices.map((invoice) => {
                      const statusConfig = getStatusConfig(invoice.status, invoice.credit_overdue);
                      const StatusIcon = statusConfig.icon;
                      return (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4"><span className="font-mono font-medium">{invoice.invoice_number}</span></td>
                          <td className="px-6 py-4 text-gray-600">{new Date(invoice.created_at).toLocaleDateString('ar')}</td>
                          <td className="px-6 py-4">
                            <p className={clsx('font-medium', invoice.credit_overdue && 'text-red-600')}>
                              {invoice.customer?.name || 'زبون عابر'}
                            </p>
                            {invoice.customer?.phone && <p className="text-sm text-gray-500">{invoice.customer.phone}</p>}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-800">{Number(invoice.net_amount).toFixed(3)} د.أ</p>
                            {invoice.discount_total > 0 && <p className="text-sm text-gray-500">خصم: {Number(invoice.discount_total).toFixed(3)} د.أ</p>}
                          </td>
                          <td className="px-6 py-4 text-gray-600">{invoice.warehouse?.name}</td>
                          <td className="px-6 py-4">
                            <span className={clsx('inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium', statusConfig.color)}>
                              <StatusIcon size={14} />
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button onClick={() => navigate(`/sales/invoices/${invoice.id}`)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="عرض"><Eye size={18} /></button>
                              <button onClick={() => window.open(`/sales/invoices/${invoice.id}/print`, '_blank')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="طباعة"><Printer size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== EXPENSES TAB ===== */}
      {activeTab === 'expenses' && (
        <>
          {/* Date filter + total */}
          <div className="bg-white rounded-xl shadow-card p-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
                <input type="date" value={expenseDateFrom} onChange={(e) => setExpenseDateFrom(e.target.value)} className="px-4 py-2.5 rounded-lg border border-gray-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
                <input type="date" value={expenseDateTo} onChange={(e) => setExpenseDateTo(e.target.value)} className="px-4 py-2.5 rounded-lg border border-gray-300" />
              </div>
              <div className="flex-1" />
              {expenses.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-5 py-3 text-center">
                  <p className="text-xs text-red-500 font-medium">إجمالي المصاريف</p>
                  <p className="text-xl font-bold text-red-700">{totalExpensesAmount.toFixed(3)} د.أ</p>
                </div>
              )}
            </div>
          </div>

          {/* Expenses table */}
          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            {expensesLoading ? (
              <div className="p-8 text-center">
                <div className="spinner mx-auto" />
                <p className="text-gray-500 mt-4">جاري التحميل...</p>
              </div>
            ) : expenses.length === 0 ? (
              <div className="p-12 text-center">
                <Receipt size={48} className="mx-auto text-gray-300" />
                <p className="text-gray-500 mt-4 text-lg">لا توجد مصاريف في هذه الفترة</p>
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors"
                >
                  <Plus size={18} />
                  إضافة مصروف
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">اسم المصروف</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">المبلغ</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">التاريخ</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">التفاصيل</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">الموظف</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-800">{exp.name}</td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-red-700">{Number(exp.amount).toFixed(3)} د.أ</span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{exp.expense_date}</td>
                        <td className="px-6 py-4 text-gray-500 text-sm max-w-xs truncate">{exp.notes || '—'}</td>
                        <td className="px-6 py-4 text-gray-600 text-sm">{exp.employee_name || '—'}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                            title="حذف"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-red-50 border-t-2 border-red-200">
                    <tr>
                      <td className="px-6 py-4 font-bold text-gray-700">المجموع</td>
                      <td className="px-6 py-4 font-bold text-red-700">{totalExpensesAmount.toFixed(3)} د.أ</td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== ADD EXPENSE MODAL ===== */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">إضافة مصروف جديد</h2>
              <button onClick={() => setShowAddExpense(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم المصروف <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={expenseForm.name}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="مثال: إيجار، رواتب، كهرباء..."
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المبلغ (د.أ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.000"
                  step="0.001"
                  min="0"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">التفاصيل / الملاحظات</label>
                <textarea
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="أي تفاصيل إضافية..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleAddExpense}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 btn-gold rounded-lg disabled:opacity-60"
              >
                {saving ? <div className="spinner" /> : <Plus size={18} />}
                {saving ? 'جاري الحفظ...' : 'إضافة المصروف'}
              </button>
              <button
                onClick={() => setShowAddExpense(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesListPage;
