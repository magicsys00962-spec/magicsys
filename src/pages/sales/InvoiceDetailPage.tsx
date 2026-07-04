import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Printer, RotateCcw, Download, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore, hasPermission } from '../../stores/authStore';
import type { Invoice, InvoiceItem } from '../../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface ReturnItemState {
  invoice_item_id: string;
  product_id: string | null;
  product_name: string;
  max_quantity: number;
  quantity_returned: number;
  unit_price: number;
  selected: boolean;
}

const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnItems, setReturnItems] = useState<ReturnItemState[]>([]);
  const [returnNotes, setReturnNotes] = useState('');
  const [processingReturn, setProcessingReturn] = useState(false);
  const [existingReturns, setExistingReturns] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) fetchInvoice(id);
    fetchSettings();
  }, [id]);

  const fetchSettings = async () => {
    const { data } = await supabase.from('system_settings').select('*');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((row: any) => { map[row.setting_key] = row.setting_value; });
      setSettings(map);
    }
  };

  const fetchInvoice = async (invoiceId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`*, customer:customers(*), employee:users(name), warehouse:warehouses(name, address, phone, code)`)
        .eq('id', invoiceId)
        .single();
      if (error) throw error;
      setInvoice(data as Invoice);

      const { data: itemsData } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);
      setItems(itemsData || []);

      const { data: returnsData } = await supabase
        .from('invoice_returns')
        .select('*, employee:users(name)')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false });
      setExistingReturns(returnsData || []);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      navigate('/sales/invoices');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethod = (status: string) => {
    if (status === 'PAID') return 'كاش';
    if (status === 'CREDIT') return 'دائن';
    return 'معلقة';
  };

  const handlePrint = () => { window.print(); };

  const handleDownloadPDF = () => {
    const originalTitle = document.title;
    document.title = invoice?.invoice_number || 'invoice';
    window.print();
    document.title = originalTitle;
  };

  const openReturnModal = () => {
    setReturnItems(items.map((item) => ({
      invoice_item_id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      max_quantity: item.quantity,
      quantity_returned: 0,
      unit_price: Number(item.unit_price),
      selected: false,
    })));
    setReturnNotes('');
    setShowReturnModal(true);
  };

  const handleSelectAll = () => {
    setReturnItems((prev) => prev.map((item) => ({ ...item, selected: true, quantity_returned: item.max_quantity })));
  };

  const handleProcessReturn = async () => {
    const selectedItems = returnItems.filter((i) => i.selected && i.quantity_returned > 0);
    if (selectedItems.length === 0) { toast.error('الرجاء تحديد صنف واحد على الأقل'); return; }
    for (const item of selectedItems) {
      if (item.quantity_returned > item.max_quantity) {
        toast.error(`الكمية المرجعة لـ "${item.product_name}" أكبر من المباعة`);
        return;
      }
    }
    setProcessingReturn(true);
    try {
      const itemsPayload = selectedItems.map((item) => ({
        invoice_item_id: item.invoice_item_id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity_returned: item.quantity_returned,
        unit_price: item.unit_price,
        return_amount: item.quantity_returned * item.unit_price,
      }));
      const { data, error } = await supabase.rpc('process_invoice_return', {
        p_user_id: user?.id,
        p_invoice_id: id,
        p_items: itemsPayload,
        p_notes: returnNotes || null,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'حدث خطأ');
      toast.success(`تم الإرجاع بنجاح - المبلغ: ${Number(data.total_return_amount).toFixed(3)} د.أ`);
      setShowReturnModal(false);
      fetchInvoice(id!);
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء معالجة الإرجاع');
    } finally {
      setProcessingReturn(false);
    }
  };

  const formatDateShort = (dateStr: string) => new Date(dateStr).toLocaleDateString('ar-JO');
  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>;
  if (!invoice) return null;

  const canReturn = user?.role === 'ADMIN' || hasPermission(user, 'returns');
  const totalReturns = existingReturns.reduce((s, r) => s + Number(r.total_return_amount), 0);

  const MIN_TABLE_ROWS = 12;
  const emptyRowsCount = Math.max(0, MIN_TABLE_ROWS - items.length);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Actions bar - hidden on print */}
      <div className="flex items-center justify-between mb-6 no-print">
        <button onClick={() => navigate('/sales/invoices')} className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <ArrowRight size={20} />
          العودة للفواتير
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          {canReturn && (
            <button onClick={openReturnModal} className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors">
              <RotateCcw size={18} />
              إرجاع
            </button>
          )}
          <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors">
            <Download size={18} />
            حفظ PDF
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
            <Printer size={18} />
            طباعة
          </button>
        </div>
      </div>

      {/* Returns history - screen only */}
      {existingReturns.length > 0 && (
        <div className="mb-6 bg-white rounded-xl shadow-card p-6 no-print">
          <h3 className="font-semibold text-red-700 mb-3">سجل المرتجعات:</h3>
          <div className="space-y-2">
            {existingReturns.map((ret) => (
              <div key={ret.id} className="flex items-center justify-between bg-red-50 px-4 py-2 rounded-lg text-sm">
                <div>
                  <span className="font-medium">{new Date(ret.created_at).toLocaleDateString('ar')}</span>
                  <span className="mx-2 text-gray-400">|</span>
                  <span className="text-gray-600">{ret.employee?.name}</span>
                  {ret.notes && <span className="mx-2 text-gray-500">({ret.notes})</span>}
                </div>
                <span className="font-bold text-red-600">-{Number(ret.total_return_amount).toFixed(3)} د.أ</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== PRINTABLE INVOICE ========== */}
      <div className="print-invoice bg-white" id="invoice-print">
        <div className="invoice-inner">
          {/* === HEADER === */}
          <div className="invoice-header">
            {/* Right side - Title */}
            <div className="invoice-header-right">
              <h1 className="invoice-title">فاتورة بيع</h1>
              <div className="invoice-meta">
                <span>الرقم: <strong>{invoice.invoice_number}</strong></span>
                <span>طريقة الدفع: <strong>{getPaymentMethod(invoice.status)}</strong></span>
              </div>
            </div>

            {/* Center - Logo */}
            <div className="invoice-header-center">
              <div className="invoice-logo-box">
                <img src="/image.png" alt="Logo" className="invoice-logo-img" />
              </div>
            </div>

            {/* Left side - Info fields */}
            <div className="invoice-header-left">
              <div className="invoice-info-row">
                <span className="invoice-info-label">التاريخ:</span>
                <span className="invoice-info-value">{formatDateShort(invoice.created_at)}</span>
              </div>
              <div className="invoice-info-row">
                <span className="invoice-info-label">الوقت:</span>
                <span className="invoice-info-value">{formatTime(invoice.created_at)}</span>
              </div>
              <div className="invoice-info-row">
                <span className="invoice-info-label">المخزن:</span>
                <span className="invoice-info-value">{invoice.warehouse?.name || '-'}</span>
              </div>
            </div>
          </div>

          {/* === CUSTOMER LINE === */}
          <div className="invoice-customer-line">
            <span className="invoice-customer-label">اسم العميل:</span>
            <span className="invoice-customer-name">{invoice.customer?.name || 'زبون عابر'}</span>
            <span className="invoice-customer-underline"></span>
          </div>

          {/* === ITEMS TABLE === */}
          <table className="invoice-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الكود</th>
                <th>الكمية</th>
                <th>الوحدة</th>
                <th>سعر الحبة</th>
                <th>الخصم</th>
                <th>السعر الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="item-name">{item.product_name}{item.color_name ? ` (${item.color_name})` : ''}</td>
                  <td>{item.product_id?.slice(0, 6) || '-'}</td>
                  <td>{item.quantity}</td>
                  <td>حبة</td>
                  <td>{Number(item.unit_price).toFixed(3)}</td>
                  <td>{Number(item.discount_amount) > 0 ? Number(item.discount_amount).toFixed(3) : '-'}</td>
                  <td className="item-total">{Number(item.subtotal).toFixed(3)}</td>
                </tr>
              ))}
              {Array.from({ length: emptyRowsCount }).map((_, idx) => (
                <tr key={`empty-${idx}`} className="empty-row">
                  <td>&nbsp;</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* === BOTTOM: Notes + Totals side by side === */}
          <div className="invoice-bottom">
            <div className="invoice-notes-box">
              <span className="invoice-notes-label">ملاحظات:</span>
              <p className="invoice-notes-text">{invoice.notes || ''}</p>
              {invoice.status === 'CREDIT' && invoice.credit_due_date && (
                <p className="invoice-notes-text">تاريخ الاستحقاق: {new Date(invoice.credit_due_date).toLocaleDateString('ar')}</p>
              )}
              {totalReturns > 0 && (
                <p className="invoice-notes-text" style={{ color: '#dc2626' }}>المرتجعات: -{totalReturns.toFixed(3)} د.أ</p>
              )}
            </div>
            <div className="invoice-totals-box">
              <div className="invoice-total-row">
                <span>المجموع:</span>
                <span>{Number(invoice.total_amount).toFixed(3)} د.أ</span>
              </div>
              <div className="invoice-total-row">
                <span>إجمالي الخصم:</span>
                <span>{Number(invoice.discount_total).toFixed(3)} د.أ</span>
              </div>
              <div className="invoice-total-row invoice-final-total">
                <span>السعر النهائي بعد الخصم:</span>
                <span>{Number(invoice.net_amount).toFixed(3)} د.أ</span>
              </div>
            </div>
          </div>

          {/* === FOOTER: Signatures + Contact === */}
          <div className="invoice-footer">
            <div className="invoice-signatures">
              <div className="invoice-sig-block">
                <p className="invoice-sig-name">{invoice.employee?.name || ''}</p>
                <div className="invoice-sig-line"></div>
                <span className="invoice-sig-label">توقيع الموظف</span>
              </div>
              <div className="invoice-sig-block">
                <p className="invoice-sig-name">{invoice.customer?.name || 'زبون عابر'}</p>
                <div className="invoice-sig-line"></div>
                <span className="invoice-sig-label">توقيع العميل</span>
              </div>
            </div>
            <div className="invoice-contact">
              {(settings.company_phone || (invoice.warehouse as any)?.phone) && (
                <span>رقم الهاتف: {settings.company_phone || (invoice.warehouse as any)?.phone}</span>
              )}
              {settings.company_facebook && (
                <span>فيسبوك: {settings.company_facebook}</span>
              )}
              {settings.company_email && (
                <span>البريد: {settings.company_email}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Return Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">إرجاع أصناف من الفاتورة</h2>
              <button onClick={() => setShowReturnModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">فاتورة: <span className="font-bold">{invoice.invoice_number}</span></p>
                <button onClick={handleSelectAll} className="text-sm px-3 py-1 bg-red-50 text-red-700 rounded-lg hover:bg-red-100">إرجاع الكل</button>
              </div>
              <div className="space-y-3">
                {returnItems.map((item, idx) => (
                  <div key={item.invoice_item_id} className={clsx('p-4 rounded-lg border transition-colors', item.selected ? 'border-red-300 bg-red-50' : 'border-gray-200')}>
                    <div className="flex items-center justify-between gap-4">
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input type="checkbox" checked={item.selected} onChange={(e) => { const c = e.target.checked; setReturnItems((p) => p.map((it, i) => i === idx ? { ...it, selected: c, quantity_returned: c ? it.max_quantity : 0 } : it)); }} className="w-4 h-4 text-red-600 rounded" />
                        <div>
                          <p className="font-medium text-gray-800">{item.product_name}</p>
                          <p className="text-sm text-gray-500">سعر: {item.unit_price.toFixed(3)} | كمية مباعة: {item.max_quantity}</p>
                        </div>
                      </label>
                      {item.selected && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">الكمية:</label>
                          <input type="number" value={item.quantity_returned} onChange={(e) => { const v = Math.min(Number(e.target.value), item.max_quantity); setReturnItems((p) => p.map((it, i) => i === idx ? { ...it, quantity_returned: Math.max(0, v) } : it)); }} className="w-20 px-2 py-1 border border-gray-300 rounded text-center" min="0" max={item.max_quantity} />
                        </div>
                      )}
                    </div>
                    {item.selected && item.quantity_returned > 0 && (
                      <p className="mt-2 text-sm font-semibold text-red-600">مبلغ الإرجاع: {(item.quantity_returned * item.unit_price).toFixed(3)} د.أ</p>
                    )}
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات الإرجاع</label>
                <textarea value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-gold-500 focus:ring-2 focus:ring-gold-200" rows={2} placeholder="سبب الإرجاع..." />
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">إجمالي المبلغ المرجع:</span>
                  <span className="text-xl font-bold text-red-600">{returnItems.filter((i) => i.selected && i.quantity_returned > 0).reduce((s, i) => s + i.quantity_returned * i.unit_price, 0).toFixed(3)} د.أ</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowReturnModal(false)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">إلغاء</button>
              <button onClick={handleProcessReturn} disabled={processingReturn} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50">{processingReturn ? 'جاري المعالجة...' : 'تأكيد الإرجاع'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetailPage;
