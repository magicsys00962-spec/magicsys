import React, { useEffect, useState } from 'react';
import { Warehouse, Package, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Warehouse as WarehouseType, Product } from '../../types';
import clsx from 'clsx';

interface WarehouseWithStats extends WarehouseType {
  product_count: number;
  total_value: number;
}

const WarehouseInventoryPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<WarehouseWithStats[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => { fetchWarehouses(); }, []);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const { data: whs } = await supabase.from('warehouses').select('*').order('name');
      if (!whs) { setLoading(false); return; }

      const warehouseStats: WarehouseWithStats[] = [];
      for (const wh of whs) {
        const { count } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('warehouse_id', wh.id)
          .eq('is_archived', false);

        const { data: valueData } = await supabase
          .from('products')
          .select('quantity_in_stock, retail_price')
          .eq('warehouse_id', wh.id)
          .eq('is_archived', false);

        const totalValue = (valueData || []).reduce((sum, p) => sum + Number(p.quantity_in_stock) * Number(p.retail_price), 0);
        warehouseStats.push({ ...wh, product_count: count || 0, total_value: totalValue });
      }
      setWarehouses(warehouseStats);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWarehouse = async (whId: string) => {
    if (expandedId === whId) {
      setExpandedId(null);
      setProducts([]);
      setProductSearch('');
      return;
    }
    setExpandedId(whId);
    setLoadingProducts(true);
    setProductSearch('');
    try {
      const { data } = await supabase
        .from('products')
        .select('*, category:product_categories(name)')
        .eq('warehouse_id', whId)
        .eq('is_archived', false)
        .order('name');
      setProducts(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const getUnitLabel = (unit: string) => {
    const labels: Record<string, string> = { piece: 'قطعة', meter: 'متر', box: 'صندوق', kg: 'كيلو' };
    return labels[unit] || unit;
  };

  const filteredProducts = products.filter(
    (p) => !productSearch || p.name.includes(productSearch) || p.sku_code.toLowerCase().includes(productSearch.toLowerCase()) || (p.color_name && p.color_name.includes(productSearch))
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">تنظيم المخازن</h1>
        <p className="text-gray-500 mt-1">عرض مخزون كل مخزن من المخازن</p>
      </div>

      <div className="space-y-4">
        {warehouses.map((wh) => (
          <div key={wh.id} className="bg-white rounded-xl shadow-card overflow-hidden">
            <button
              onClick={() => toggleWarehouse(wh.id)}
              className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Warehouse size={24} className="text-blue-600" />
                </div>
                <div className="text-right">
                  <h3 className="font-bold text-gray-800 text-lg">{wh.name}</h3>
                  <p className="text-sm text-gray-500">{wh.address || 'بدون عنوان'}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-left">
                  <p className="text-sm text-gray-500">{wh.product_count} منتج</p>
                  <p className="font-semibold text-gray-800">{wh.total_value.toFixed(3)} د.أ</p>
                </div>
                {expandedId === wh.id ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
              </div>
            </button>

            {expandedId === wh.id && (
              <div className="border-t border-gray-200">
                <div className="p-4 bg-gray-50">
                  <div className="relative">
                    <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="بحث في منتجات هذا المخزن..."
                      className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200 text-sm"
                    />
                  </div>
                </div>
                {loadingProducts ? (
                  <div className="p-8 text-center"><div className="spinner mx-auto" /></div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">لا توجد منتجات</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">المنتج</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">الرمز</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">اللون</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">الكمية</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">السعر</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{p.name}</td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.sku_code}</td>
                            <td className="px-4 py-3 text-gray-600">{p.color_name || '-'}</td>
                            <td className={clsx('px-4 py-3 font-semibold', p.quantity_in_stock <= p.reorder_level ? 'text-red-600' : 'text-gray-800')}>
                              {p.quantity_in_stock} {getUnitLabel(p.unit)}
                            </td>
                            <td className="px-4 py-3">{Number(p.retail_price).toFixed(3)} د.أ</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WarehouseInventoryPage;
