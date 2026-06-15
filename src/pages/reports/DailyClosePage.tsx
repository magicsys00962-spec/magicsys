import React, { useEffect, useState } from 'react';
import { Printer, CheckCircle, Clock, DollarSign, CreditCard, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { Invoice, DailyExpense } from '../../types';
import Logo from '../../components/Logo';
import toast from 'react-hot-toast';

interface DailyReport {
  paidInvoices: Invoice[];
  pendingInvoices: Invoice[];
  creditInvoices: Invoice[];
  expenses: DailyExpense[];
  totalPaid: number;
  totalPending: number;
  totalCredit: number;
  totalExpenses: number;
  netCash: number;
}

const DailyClosePage: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [warehouseName, setWarehouseName] = useState('');

  const today = new Date().toLocaleDateString('ar-JO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const todayISO = new Date().toISOString().split('T')[0];

  useEffect(() => {
    generateTodayReport();
  }, [user]);

  const generateTodayReport = async () => {
    if (!user?.warehouse_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: wh } = await supabase
        .from('warehouses')
        .select('name')
        .eq('id', user.warehouse_id)
        .single();
      if (wh) setWarehouseName(wh.name);

      const dateFrom = new Date(todayISO);
      dateFrom.setHours(0, 0, 0, 0);
      const dateTo = new Date(todayISO);
      dateTo.setHours(23, 59, 59, 999);

      const [{ data: invoices }, expensesResult] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, customer:customers(name)')
          .eq('warehouse_id', user.warehouse_id)
          .gte('created_at', dateFrom.toISOString())
          .lte('created_at', dateTo.toISOString()),
        supabase.rpc('get_expenses', {
          p_user_id: user.id,
          p_warehouse_id: user.warehouse_id,
          p_date_from: todayISO,
          p_date_to: todayISO,
        }),
      ]);

      const expenses = expensesResult.data?.success ? expensesResult.data.expenses : [];

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

  if (!user?.warehouse_id) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <FileText size={48} className="text-gray-300 mx-auto" />
          <p className="text-gray-500 text-lg">لم يتم تعيين مخزن لحسابك</p>
          <p className="text-gray-400 text-sm">تواصل مع المدير لتعيين مخزن</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="spinner mx-auto" />
          <p className="text-gray-500">جاري تحميل تقرير اليوم...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header - hidden when printing */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إغلاق اليوم</h1>
          <p className="text-gray-500 mt-1">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={generateTodayReport}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <CheckCircle size={18} />
            تحديث
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 btn-gold rounded-lg"
          >
            <Printer size={18} />
            طباعة التقرير
          </button>
        </div>
      </div>

      {/* Report Content - this is the print area */}
      {report && (
        <div className="print-area" id="daily-close-report">
          {/* Print Header */}
          <div className="hidden print:block mb-6 text-center border-b-2 border-gray-300 pb-4">
            <h2 className="text-xl font-bold">تقرير إغلاق اليوم</h2>
            <p className="text-gray-600 mt-1">{warehouseName} - {todayISO}</p>
            <p className="text-sm text-gray-500">الموظف: {user?.name}</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-card p-4 lg:p-5 border-r-4 border-green-500">
              <div className="flex items-center gap-2 lg:gap-3 mb-2">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign size={18} className="text-green-600 lg:w-5 lg:h-5" />
                </div>
                <span className="text-xs lg:text-sm text-gray-500">المبيعات (كاش)</span>
              </div>
              <p className="text-lg lg:text-2xl font-bold text-gray-800">{report.totalPaid.toFixed(3)}</p>
              <p className="text-xs text-gray-400 mt-1">{report.paidInvoices.length} فاتورة</p>
            </div>

            <div className="bg-white rounded-xl shadow-card p-4 lg:p-5 border-r-4 border-amber-500">
              <div className="flex items-center gap-2 lg:gap-3 mb-2">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock size={18} className="text-amber-600 lg:w-5 lg:h-5" />
                </div>
                <span className="text-xs lg:text-sm text-gray-500">معلقة</span>
              </div>
              <p className="text-lg lg:text-2xl font-bold text-gray-800">{report.totalPending.toFixed(3)}</p>
              <p className="text-xs text-gray-400 mt-1">{report.pendingInvoices.length} فاتورة</p>
            </div>

            <div className="bg-white rounded-xl shadow-card p-4 lg:p-5 border-r-4 border-orange-500">
              <div className="flex items-center gap-2 lg:gap-3 mb-2">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <CreditCard size={18} className="text-orange-600 lg:w-5 lg:h-5" />
                </div>
                <span className="text-xs lg:text-sm text-gray-500">آجل</span>
              </div>
              <p className="text-lg lg:text-2xl font-bold text-gray-800">{report.totalCredit.toFixed(3)}</p>
              <p className="text-xs text-gray-400 mt-1">{report.creditInvoices.length} فاتورة</p>
            </div>

            <div className="bg-white rounded-xl shadow-card p-4 lg:p-5 border-r-4 border-red-500">
              <div className="flex items-center gap-2 lg:gap-3 mb-2">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <CreditCard size={18} className="text-red-600 lg:w-5 lg:h-5" />
                </div>
                <span className="text-xs lg:text-sm text-gray-500">المصروفات</span>
              </div>
              <p className="text-lg lg:text-2xl font-bold text-gray-800">{report.totalExpenses.toFixed(3)}</p>
              <p className="text-xs text-gray-400 mt-1">{report.expenses.length} مصروف</p>
            </div>
          </div>

          {/* Net Cash - prominent */}
          <div className="bg-gradient-to-l from-gold-500 to-gold-600 rounded-xl p-4 lg:p-6 mb-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-gray-800 font-medium text-sm lg:text-base">صافي الكاش (بعد المصروفات)</p>
                <p className="text-xs text-gray-700 mt-1">= المبيعات الكاش - المصروفات</p>
              </div>
              <div className="text-right sm:text-left">
                <p className="text-2xl lg:text-3xl font-bold text-gray-900">{report.netCash.toFixed(3)}</p>
                <p className="text-sm text-gray-800">د.أ</p>
              </div>
            </div>
          </div>

          {/* Paid Invoices Table */}
          {report.paidInvoices.length > 0 && (
            <div className="bg-white rounded-xl shadow-card overflow-hidden mb-4">
              <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
                <h3 className="font-semibold text-gray-800">
                  الفواتير المدفوعة ({report.paidInvoices.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">رقم الفاتورة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الزبون</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">المبلغ</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الوقت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.paidInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm">{inv.invoice_number}</td>
                        <td className="px-4 py-3">{inv.customer?.name || 'زبون عابر'}</td>
                        <td className="px-4 py-3 font-semibold text-green-700">{Number(inv.net_amount).toFixed(3)} د.أ</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(inv.created_at).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-green-50">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 font-bold">المجموع</td>
                      <td colSpan={2} className="px-4 py-3 font-bold text-green-700">{report.totalPaid.toFixed(3)} د.أ</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Pending Invoices */}
          {report.pendingInvoices.length > 0 && (
            <div className="bg-white rounded-xl shadow-card overflow-hidden mb-4">
              <div className="px-6 py-4 border-b border-gray-200 bg-amber-50">
                <h3 className="font-semibold text-gray-800">
                  الفواتير المعلقة ({report.pendingInvoices.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">رقم الفاتورة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الزبون</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.pendingInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm">{inv.invoice_number}</td>
                        <td className="px-4 py-3">{inv.customer?.name || 'زبون عابر'}</td>
                        <td className="px-4 py-3 font-semibold text-amber-700">{Number(inv.net_amount).toFixed(3)} د.أ</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-amber-50">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 font-bold">المجموع</td>
                      <td className="px-4 py-3 font-bold text-amber-700">{report.totalPending.toFixed(3)} د.أ</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Credit Invoices */}
          {report.creditInvoices.length > 0 && (
            <div className="bg-white rounded-xl shadow-card overflow-hidden mb-4">
              <div className="px-6 py-4 border-b border-gray-200 bg-orange-50">
                <h3 className="font-semibold text-gray-800">
                  فواتير الآجل ({report.creditInvoices.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">رقم الفاتورة</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الزبون</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.creditInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm">{inv.invoice_number}</td>
                        <td className="px-4 py-3">{inv.customer?.name || 'زبون عابر'}</td>
                        <td className="px-4 py-3 font-semibold text-orange-700">{Number(inv.net_amount).toFixed(3)} د.أ</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-orange-50">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 font-bold">المجموع</td>
                      <td className="px-4 py-3 font-bold text-orange-700">{report.totalCredit.toFixed(3)} د.أ</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Expenses */}
          {report.expenses.length > 0 && (
            <div className="bg-white rounded-xl shadow-card overflow-hidden mb-4">
              <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
                <h3 className="font-semibold text-gray-800">
                  المصروفات ({report.expenses.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">البند</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">الملاحظات</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{exp.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{exp.notes || '-'}</td>
                        <td className="px-4 py-3 font-semibold text-red-700">{Number(exp.amount).toFixed(3)} د.أ</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-red-50">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 font-bold">المجموع</td>
                      <td className="px-4 py-3 font-bold text-red-700">{report.totalExpenses.toFixed(3)} د.أ</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* No data message */}
          {report.paidInvoices.length === 0 &&
            report.pendingInvoices.length === 0 &&
            report.creditInvoices.length === 0 &&
            report.expenses.length === 0 && (
              <div className="bg-white rounded-xl shadow-card p-12 text-center">
                <FileText size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">لا توجد عمليات لهذا اليوم بعد</p>
                <p className="text-gray-400 text-sm mt-2">ستظهر الفواتير والمصروفات هنا تلقائيا</p>
              </div>
            )}

          {/* Print Footer */}
          <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
            <p>تم إنشاء التقرير بتاريخ {todayISO} - {user?.name} - {warehouseName}</p>
            <p className="mt-1">Magic - نظام إدارة الديكور</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyClosePage;
