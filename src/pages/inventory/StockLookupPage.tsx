import React, { useState } from 'react';
import { Search, Package, Warehouse } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StockResult {
  id: string;
  name: string;
  sku_code: string;
  color_name: string | null;
  quantity_in_stock: number;
  unit: string;
  retail_price: number;
  wholesale_price: number | null;
  warehouse_id: string;
  warehouse_name: string;
  warehouse_code: string;
}

const StockLookupPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<StockResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!search.trim() || search.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.rpc('search_product_across_warehouses', {
        p_search: search.trim(),
      });
      if (error) throw error;
      setResults(data?.results || []);
    } catch (error) {
      console.error('Error searching:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const getUnitLabel = (unit: string) => {
    const labels: Record<string, string> = { piece: 'قطعة', meter: 'متر', box: 'صندوق', kg: 'كيلو' };
    return labels[unit] || unit;
  };

  const grouped = results.reduce<Record<string, StockResult[]>>((acc, item) => {
    const key = `${item.name}-${item.sku_code}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">البحث عن مادة</h1>
        <p className="text-gray-500 mt-1">استعلم عن توافر المواد في جميع المستودعات</p>
      </div>

      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="ابحث باسم المنتج أو رمز SKU أو اللون..."
              className="w-full pr-10 pl-4 py-3 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || search.trim().length < 2}
            className="px-6 py-3 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'جاري البحث...' : 'بحث'}
          </button>
        </div>
      </div>

      {searched && !loading && results.length === 0 && (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <Package size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">لا توجد نتائج</p>
          <p className="text-gray-400 text-sm mt-1">جرب البحث بكلمة مختلفة</p>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <div className="spinner mx-auto" />
          <p className="text-gray-500 mt-4">جاري البحث...</p>
        </div>
      )}

      {!loading && Object.keys(grouped).length > 0 && (
        <div className="space-y-4">
          {Object.entries(grouped).map(([key, items]) => (
            <div key={key} className="bg-white rounded-xl shadow-card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-3">
                  <Package size={20} className="text-gold-600" />
                  <div>
                    <h3 className="font-semibold text-gray-800">{items[0].name}</h3>
                    <p className="text-sm text-gray-500">
                      رمز: {items[0].sku_code}
                      {items[0].color_name && ` | لون: ${items[0].color_name}`}
                    </p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <div key={`${item.id}-${item.warehouse_id}`} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Warehouse size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{item.warehouse_name}</p>
                        <p className="text-xs text-gray-500">كود: {item.warehouse_code}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-800">{item.quantity_in_stock} {getUnitLabel(item.unit)}</p>
                      <p className="text-sm text-gray-500">{Number(item.retail_price).toFixed(3)} د.أ</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StockLookupPage;
