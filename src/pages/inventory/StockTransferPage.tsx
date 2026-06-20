import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, Search, History, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { Product, Warehouse, StockTransfer } from '../../types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const StockTransferPage: React.FC = () => {
  const { user } = useAuthStore();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [tab, setTab] = useState<'transfer' | 'history'>('transfer');

  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [fromWarehouse, setFromWarehouse] = useState('');
  const [toWarehouse, setToWarehouse] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchWarehouses();
    fetchTransferHistory();
  }, []);

  useEffect(() => {
    if (search.length >= 2) {
      fetchProducts();
    } else {
      setProducts([]);
    }
  }, [search]);

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name');
    setWarehouses(data || []);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*, warehouse:warehouses(*)')
      .eq('is_archived', false)
      .or(`name.ilike.%${search}%,sku_code.ilike.%${search}%`)
      .order('name')
      .limit(20);
    setProducts(data || []);
  };

  const fetchTransferHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stock_transfers')
        .select(`
          *,
          from_warehouse:warehouses!stock_transfers_from_warehouse_id_fkey(*),
          to_warehouse:warehouses!stock_transfers_to_warehouse_id_fkey(*),
          requested_by:users!stock_transfers_requested_by_id_fkey(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setTransfers(data || []);
    } catch (error) {
      console.error('Error fetching transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setFromWarehouse(product.warehouse_id);
    setSearch('');
    setProducts([]);
  };

  const handleTransfer = async () => {
    if (!selectedProduct) {
      toast.error('الرجاء اختيار منتج');
      return;
    }
    if (!fromWarehouse || !toWarehouse) {
      toast.error('الرجاء اختيار المخزن المصدر والوجهة');
      return;
    }
    if (fromWarehouse === toWarehouse) {
      toast.error('المخزن المصدر والوجهة يجب أن يكونا مختلفين');
      return;
    }
    if (quantity <= 0) {
      toast.error('الرجاء إدخال كمية صحيحة');
      return;
    }

    setTransferring(true);
    try {
      const { data, error } = await supabase.rpc('transfer_stock', {
        p_user_id: user?.id,
        p_product_id: selectedProduct.id,
        p_from_warehouse_id: fromWarehouse,
        p_to_warehouse_id: toWarehouse,
        p_quantity: quantity,
        p_notes: notes || null,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message);

      toast.success(data.message);
      setSelectedProduct(null);
      setFromWarehouse('');
      setToWarehouse('');
      setQuantity(0);
      setNotes('');
      fetchTransferHistory();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    } finally {
      setTransferring(false);
    }
  };

  const getUnitLabel = (unit: string) => {
    const units: Record<string, string> = { piece: 'قطعة', box: 'صندوق', meter: 'متر', kg: 'كيلو' };
    return units[unit] || unit;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">نقل المنتجات</h1>
        <p className="text-gray-500 mt-1">نقل المنتجات بين المخازن وسجل النقليات</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('transfer')}
          className={clsx(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            tab === 'transfer' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <span className="flex items-center gap-2"><ArrowLeftRight size={16} /> نقل جديد</span>
        </button>
        <button
          onClick={() => setTab('history')}
          className={clsx(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            tab === 'history' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <span className="flex items-center gap-2"><History size={16} /> سجل النقليات</span>
        </button>
      </div>

      {tab === 'transfer' && (
        <div className="bg-white rounded-xl shadow-card p-6 space-y-6">
          {/* Product search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">اختر المنتج</label>
            {selectedProduct ? (
              <div className="flex items-center justify-between p-4 bg-gold-50 border border-gold-200 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-800">{selectedProduct.name}</p>
                  <p className="text-sm text-gray-500">{selectedProduct.sku_code} - المتوفر: <span className="font-bold text-green-600">{selectedProduct.quantity_in_stock} {getUnitLabel(selectedProduct.unit)}</span></p>
                </div>
                <button onClick={() => setSelectedProduct(null)} className="text-sm text-red-500 hover:text-red-700">تغيير</button>
              </div>
            ) : (
              <div className="relative">
                <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث عن المنتج بالاسم أو الرمز..."
                  className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                />
                {products.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-10">
                    {products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectProduct(p)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-right border-b border-gray-100 last:border-b-0"
                      >
                        <div>
                          <p className="font-medium text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.sku_code} - {p.warehouse?.name}</p>
                        </div>
                        <span className="text-sm font-bold text-green-600">{p.quantity_in_stock} {getUnitLabel(p.unit)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Warehouses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">من المخزن</label>
              <select
                value={fromWarehouse}
                onChange={(e) => setFromWarehouse(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                disabled={!!selectedProduct}
              >
                <option value="">اختر المخزن المصدر</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">إلى المخزن</label>
              <select
                value={toWarehouse}
                onChange={(e) => setToWarehouse(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
              >
                <option value="">اختر المخزن الوجهة</option>
                {warehouses.filter((wh) => wh.id !== fromWarehouse).map((wh) => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الكمية</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={quantity || ''}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="أدخل الكمية"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات (اختياري)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="سبب النقل..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
              />
            </div>
          </div>

          <button
            onClick={handleTransfer}
            disabled={transferring || !selectedProduct}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            <ArrowLeftRight size={20} />
            {transferring ? 'جاري النقل...' : 'تنفيذ النقل'}
          </button>
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="spinner mx-auto" />
              <p className="text-gray-500 mt-4">جاري التحميل...</p>
            </div>
          ) : transfers.length === 0 ? (
            <div className="p-12 text-center">
              <Package size={48} className="mx-auto text-gray-300" />
              <p className="text-gray-500 mt-4">لا توجد عمليات نقل سابقة</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transfers.map((t) => (
                <div key={t.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <ArrowLeftRight size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{t.product_name || 'منتج محذوف'}</p>
                        <p className="text-sm text-gray-500">
                          {t.from_warehouse?.name || '—'} → {t.to_warehouse?.name || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-800">{t.quantity}</p>
                      <p className="text-xs text-gray-500">{new Date(t.created_at).toLocaleDateString('ar-EG')}</p>
                    </div>
                  </div>
                  {t.notes && <p className="text-sm text-gray-500 mt-2 pr-13">{t.notes}</p>}
                  {t.requested_by && <p className="text-xs text-gray-400 mt-1 pr-13">بواسطة: {(t.requested_by as any)?.name}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StockTransferPage;
