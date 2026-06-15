import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Phone,
  User,
  Calendar,
  ShoppingCart,
  Eye,
  CreditCard,
  AlertTriangle,
  Tag,
  Plus,
  Trash2,
  Search,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { Customer, Invoice, Product } from '../../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface PriceOverride {
  id: string;
  product_id: string;
  custom_price: number;
  product_name: string;
  product_sku: string;
  color_name: string | null;
}

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalSpent: 0, totalInvoices: 0, overdueCount: 0 });

  // Craftsman price overrides
  const [priceOverrides, setPriceOverrides] = useState<PriceOverride[]>([]);
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customPrice, setCustomPrice] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCustomer(id);
      fetchPriceOverrides(id);
    }
  }, [id]);

  useEffect(() => {
    if (productSearch.length >= 2) {
      searchProducts();
    } else {
      setProductResults([]);
    }
  }, [productSearch]);

  const searchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .or(`name.ilike.%${productSearch}%,sku_code.ilike.%${productSearch}%`)
      .limit(10);
    setProductResults(data || []);
  };

  const fetchCustomer = async (customerId: string) => {
    setLoading(true);
    try {
      const [{ data: custData, error: custErr }, { data: invData }] = await Promise.all([
        supabase.from('customers').select('*, user:users(name, craftsman_code)').eq('id', customerId).single(),
        supabase
          .from('invoices')
          .select('*, warehouse:warehouses(name), employee:users(name)')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),
      ]);
      if (custErr) throw custErr;
      setCustomer(custData);
      setInvoices(invData || []);
      const totalSpent = (invData || []).reduce((s, i) => s + Number(i.net_amount), 0);
      const overdueCount = (invData || []).filter((i) => i.credit_overdue).length;
      setStats({ totalSpent, totalInvoices: invData?.length || 0, overdueCount });
    } catch (error) {
      console.error('Error:', error);
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceOverrides = async (customerId: string) => {
    try {
      const { data } = await supabase.rpc('get_craftsman_prices', {
        p_craftsman_customer_id: customerId,
      });
      if (data?.success) setPriceOverrides(data.overrides || []);
    } catch (err) {
      console.error('Error fetching overrides:', err);
    }
  };

  const handleAddOverride = async () => {
    if (!selectedProduct || !customPrice || Number(customPrice) < 0) {
      toast.error('اختر منتجاً وأدخل السعر');
      return;
    }
    if (!user?.id || !id) return;
    setSavingOverride(true);
    try {
      const { data, error } = await supabase.rpc('upsert_craftsman_price', {
        p_user_id: user.id,
        p_craftsman_customer_id: id,
        p_product_id: selectedProduct.id,
        p_custom_price: Number(customPrice),
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message);
      toast.success('تم حفظ السعر المخصص');
      setShowAddOverride(false);
      setSelectedProduct(null);
      setCustomPrice('');
      setProductSearch('');
      fetchPriceOverrides(id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setSavingOverride(false);
    }
  };

  const handleDeleteOverride = async (overrideId: string) => {
    if (!user?.id || !id) return;
    try {
      const { data, error } = await supabase.rpc('delete_craftsman_price', {
        p_user_id: user.id,
        p_override_id: overrideId,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message);
      toast.success('تم حذف السعر المخصص');
      setPriceOverrides((prev) => prev.filter((o) => o.id !== overrideId));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'WALK_IN': return 'زبون عابر';
      case 'CRAFTSMAN': return 'صنايعي';
      case 'COMPANY': return 'شركة';
      default: return type;
    }
  };

  const getStatusBadge = (status: string, overdue?: boolean) => {
    if (status === 'PAID') return { label: 'مدفوعة', class: 'bg-green-100 text-green-700' };
    if (status === 'PENDING') return { label: 'معلقة', class: 'bg-amber-100 text-amber-700' };
    if (status === 'CREDIT' && overdue) return { label: 'متأخرة', class: 'bg-red-100 text-red-700' };
    if (status === 'CREDIT') return { label: 'دائن', class: 'bg-orange-100 text-orange-700' };
    return { label: status, class: 'bg-gray-100 text-gray-700' };
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>;
  }
  if (!customer) return null;

  const isCraftsman = customer.type === 'CRAFTSMAN';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/customers')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <ArrowRight size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{customer.name}</h1>
          <p className="text-gray-500">{getTypeLabel(customer.type)}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Phone size={16} /><span className="text-sm">الهاتف</span>
          </div>
          <p className="font-semibold text-gray-800" dir="ltr">{customer.phone || '-'}</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <ShoppingCart size={16} /><span className="text-sm">عدد الفواتير</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.totalInvoices}</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <CreditCard size={16} /><span className="text-sm">إجمالي المشتريات</span>
          </div>
          <p className="text-2xl font-bold text-gold-600">{stats.totalSpent.toFixed(3)} <span className="text-sm text-gray-400">د.أ</span></p>
        </div>
        {stats.overdueCount > 0 && (
          <div className="bg-red-50 rounded-xl shadow-card p-5">
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <AlertTriangle size={16} /><span className="text-sm">فواتير متأخرة</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.overdueCount}</p>
          </div>
        )}
      </div>

      {/* Craftsman Info */}
      {isCraftsman && (customer as any).user && (
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center gap-3">
            <User size={20} className="text-gold-500" />
            <div>
              <p className="text-sm text-gray-500">رمز الصنايعي</p>
              <p className="font-bold font-mono text-lg text-gold-600">
                {(customer as any).user?.craftsman_code || '-'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Craftsman Custom Prices (Admin only) */}
      {isCraftsman && isAdmin && (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Tag size={20} className="text-gold-500" />
              <h2 className="text-lg font-bold text-gray-800">الأسعار المخصصة</h2>
              {priceOverrides.length > 0 && (
                <span className="bg-gold-100 text-gold-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {priceOverrides.length} منتج
                </span>
              )}
            </div>
            <button
              onClick={() => setShowAddOverride(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors text-sm"
            >
              <Plus size={16} />
              إضافة سعر مخصص
            </button>
          </div>

          {priceOverrides.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Tag size={36} className="mx-auto mb-3 text-gray-200" />
              <p>لا توجد أسعار مخصصة لهذا الصنايعي</p>
              <p className="text-xs mt-1">عند إضافة سعر مخصص، سيتطبق تلقائياً على فواتيره</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-right font-semibold text-gray-700">المنتج</th>
                    <th className="px-5 py-3 text-right font-semibold text-gray-700">اللون</th>
                    <th className="px-5 py-3 text-right font-semibold text-gray-700">السعر المخصص</th>
                    <th className="px-5 py-3 text-right font-semibold text-gray-700">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {priceOverrides.map((ov) => (
                    <tr key={ov.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-800">{ov.product_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{ov.product_sku}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{ov.color_name || '—'}</td>
                      <td className="px-5 py-3 font-bold text-gold-700">
                        {Number(ov.custom_price).toFixed(3)} د.أ
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleDeleteOverride(ov.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {customer.notes && (
        <div className="bg-white rounded-xl shadow-card p-5">
          <h3 className="font-semibold text-gray-700 mb-2">ملاحظات</h3>
          <p className="text-gray-600">{customer.notes}</p>
        </div>
      )}

      {/* Purchase History */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">سجل المشتريات</h2>
        </div>
        {invoices.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart size={48} className="mx-auto text-gray-300" />
            <p className="text-gray-500 mt-4">لا توجد فواتير</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-700">رقم الفاتورة</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-700">التاريخ</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-700">المبلغ</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-700">المخزن</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-700">الحالة</th>
                  <th className="px-5 py-3 text-right text-sm font-semibold text-gray-700">عرض</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => {
                  const badge = getStatusBadge(inv.status, inv.credit_overdue);
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-mono font-medium">{inv.invoice_number}</td>
                      <td className="px-5 py-3 text-gray-600">{new Date(inv.created_at).toLocaleDateString('ar')}</td>
                      <td className="px-5 py-3 font-semibold">{Number(inv.net_amount).toFixed(3)} د.أ</td>
                      <td className="px-5 py-3 text-gray-500">{(inv as any).warehouse?.name}</td>
                      <td className="px-5 py-3">
                        <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', badge.class)}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => navigate(`/sales/invoices/${inv.id}`)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {invoices.length > 0 && (
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <span className="text-sm text-gray-500">آخر زيارة: {new Date(invoices[0].created_at).toLocaleDateString('ar')}</span>
            <span className="font-semibold text-gray-700">المجموع: {stats.totalSpent.toFixed(3)} د.أ</span>
          </div>
        )}
      </div>

      <div className="text-center text-sm text-gray-400 flex items-center justify-center gap-2">
        <Calendar size={14} />
        تاريخ التسجيل: {new Date(customer.created_at).toLocaleDateString('ar')}
      </div>

      {/* Add Override Modal */}
      {showAddOverride && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">إضافة سعر مخصص</h2>
              <button onClick={() => { setShowAddOverride(false); setSelectedProduct(null); setProductSearch(''); }} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ابحث عن المنتج <span className="text-red-500">*</span>
                </label>
                {selectedProduct ? (
                  <div className="flex items-center justify-between p-3 bg-gold-50 border border-gold-200 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-800">{selectedProduct.name}</p>
                      <p className="text-xs text-gray-500">{selectedProduct.sku_code} • {selectedProduct.color_name || '-'}</p>
                    </div>
                    <button onClick={() => { setSelectedProduct(null); setProductSearch(''); }} className="text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="اسم المنتج أو الكود..."
                      className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                    />
                    {productResults.length > 0 && (
                      <div className="absolute w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                        {productResults.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => { setSelectedProduct(p); setCustomPrice(String(p.craftsman_price || p.retail_price)); setProductResults([]); }}
                            className="w-full p-3 text-right hover:bg-gray-50 border-b border-gray-100 last:border-0"
                          >
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.sku_code} • {p.color_name || '-'} • سعر الصنايعي: {Number(p.craftsman_price || p.retail_price).toFixed(3)} د.أ</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  السعر المخصص (د.أ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="0.000"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                />
                {selectedProduct && (
                  <p className="text-xs text-gray-500 mt-1">
                    سعر الصنايعي الافتراضي: {Number(selectedProduct.craftsman_price || selectedProduct.retail_price).toFixed(3)} د.أ
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleAddOverride}
                disabled={savingOverride}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 btn-gold rounded-lg disabled:opacity-60"
              >
                {savingOverride ? <div className="spinner" /> : <Plus size={18} />}
                {savingOverride ? 'جاري الحفظ...' : 'حفظ السعر'}
              </button>
              <button onClick={() => { setShowAddOverride(false); setSelectedProduct(null); setProductSearch(''); }} className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetailPage;
