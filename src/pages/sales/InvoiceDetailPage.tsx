import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Printer, CheckCircle, Clock, AlertTriangle, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Invoice, InvoiceItem } from '../../types';
import Logo from '../../components/Logo';
import clsx from 'clsx';

const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchInvoice(id);
    }
  }, [id]);

  const fetchInvoice = async (invoiceId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(*),
          employee:users(name),
          warehouse:warehouses(name, address, phone)
        `)
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      setInvoice(data as Invoice);

      // Fetch items
      const { data: itemsData } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      setItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      navigate('/sales/invoices');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string, overdue?: boolean) => {
    if (status === 'PAID') {
      return { label: 'مدفوعة', icon: CheckCircle, color: 'bg-green-100 text-green-700' };
    }
    if (status === 'PENDING') {
      return { label: 'معلقة', icon: Clock, color: 'bg-amber-100 text-amber-700' };
    }
    if (status === 'CREDIT') {
      if (overdue) {
        return { label: 'متأخرة', icon: AlertTriangle, color: 'bg-red-100 text-red-700' };
      }
      return { label: 'دائن', icon: CreditCard, color: 'bg-orange-100 text-orange-700' };
    }
    return { label: status, icon: Clock, color: 'bg-gray-100 text-gray-700' };
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  const statusConfig = getStatusConfig(invoice.status, invoice.credit_overdue);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Actions bar (no-print) */}
      <div className="flex items-center justify-between mb-6 no-print">
        <button
          onClick={() => navigate('/sales/invoices')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowRight size={20} />
          العودة للفواتير
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            <Printer size={18} />
            طباعة
          </button>
        </div>
      </div>

      {/* Invoice */}
      <div className="bg-white rounded-xl shadow-card print-invoice" id="invoice-print">
        {/* Header */}
        <div className="p-8 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3">
                <Logo variant="full" size="md" theme="light" />
              </div>
            </div>
            <div className="text-left">
              <h2 className="text-xl font-bold text-gray-800">فاتورة بيع</h2>
              <p className="font-mono text-gray-600">{invoice.invoice_number}</p>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(invoice.created_at).toLocaleDateString('ar')}
              </p>
            </div>
          </div>
        </div>

        {/* Warehouse and customer info */}
        <div className="grid grid-cols-2 gap-8 p-8 border-b border-gray-200">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">من:</h3>
            <p className="font-semibold text-gray-800">{invoice.warehouse?.name}</p>
            <p className="text-sm text-gray-600">{invoice.warehouse?.address}</p>
            <p className="text-sm text-gray-600">{invoice.warehouse?.phone}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">إلى:</h3>
            {invoice.customer ? (
              <>
                <p className={clsx(
                  'font-semibold',
                  invoice.credit_overdue && 'text-red-600'
                )}>
                  {invoice.customer.name}
                </p>
                {invoice.customer.phone && (
                  <p className="text-sm text-gray-600">{invoice.customer.phone}</p>
                )}
                <p className="text-sm text-gray-500">
                  {invoice.customer.type === 'CRAFTSMAN' && 'صنايعي'}
                  {invoice.customer.type === 'WALK_IN' && 'زبون عابر'}
                  {invoice.customer.type === 'COMPANY' && 'شركة'}
                </p>
              </>
            ) : (
              <p className="text-gray-500">زبون عابر</p>
            )}
          </div>
        </div>

        {/* Items table */}
        <div className="p-8">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">المنتج</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">اللون</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الكمية</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">السعر</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الخصم</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">{item.product_name}</td>
                  <td className="px-4 py-3 text-gray-600">{item.color_name || '-'}</td>
                  <td className="px-4 py-3">{item.quantity}</td>
                  <td className="px-4 py-3">{item.unit_price.toFixed(3)} د.أ</td>
                  <td className="px-4 py-3 text-red-500">
                    {item.discount_amount > 0 ? `- ${item.discount_amount.toFixed(3)}` : '-'}
                  </td>
                  <td className="px-4 py-3 font-semibold">{item.subtotal.toFixed(3)} د.أ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="p-8 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-end">
            <div className="w-72 space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>المجموع الفرعي:</span>
                <span>{invoice.total_amount.toFixed(3)} د.أ</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>الخصم:</span>
                <span className="text-red-500">-{invoice.discount_total.toFixed(3)} د.أ</span>
              </div>
              <div className="border-t border-gray-300 pt-3 flex justify-between text-xl font-bold">
                <span>الإجمالي:</span>
                <span className="text-gold-600">{invoice.net_amount.toFixed(3)} د.أ</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="mt-6 flex justify-end">
            <span
              className={clsx(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold',
                statusConfig.color
              )}
            >
              <StatusIcon size={18} />
              {statusConfig.label}
            </span>
          </div>

          {/* Credit due date */}
          {invoice.status === 'CREDIT' && invoice.credit_due_date && (
            <div className="mt-4 flex justify-end">
              <p className="text-sm text-gray-600">
                تاريخ الاستحقاق: {new Date(invoice.credit_due_date).toLocaleDateString('ar')}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="border-t border-gray-300 pt-2 mt-16">
                <p className="text-sm text-gray-500">توقيع الموظف</p>
                <p className="font-semibold mt-1">{invoice.employee?.name}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-300 pt-2 mt-16">
                <p className="text-sm text-gray-500">توقيع الزبون</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">ملاحظات:</span> {invoice.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceDetailPage;
