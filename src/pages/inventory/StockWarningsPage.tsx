import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Package, Search, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { Product } from '../../types';
import clsx from 'clsx';

const StockWarningsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLowStockProducts();
  }, [user]);

  const fetchLowStockProducts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select(`*, warehouse:warehouses(id, name, code), category:product_categories(name)`)
        .order('quantity_in_stock', { ascending: true });

      if (user?.warehouse_id && user.role === 'EMPLOYEE') {
        query = query.eq('warehouse_id', user.warehouse_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const lowStock = (data || []).filter(
        (p: any) => p.quantity_in_stock <= (p.reorder_level || 0)
      );
      setProducts(lowStock as Product[]);
    } catch (error) {
      console.error('Error fetching low stock products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.includes(search) ||
      p.sku_code.toLowerCase().includes(search.toLowerCase())
  );

  const getStockLevel = (product: Product) => {
    if (product.quantity_in_stock <= 0) return 'critical';
    if (product.quantity_in_stock <= product.reorder_level * 0.5) return 'critical';
    return 'warning';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">تنبيهات المخزون</h1>
          <p className="text-gray-500 mt-1">
            المنتجات التي وصلت أو تجاوزت حد التنبيه ({filtered.length} منتج)
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="relative">
          <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الرمز..."
            className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <div className="spinner mx-auto" />
          <p className="text-gray-500 mt-4">جاري التحميل...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <Package size={48} className="mx-auto text-green-300" />
          <p className="text-green-600 font-semibold mt-4">لا توجد تنبيهات مخزون</p>
          <p className="text-gray-400 mt-1">جميع المنتجات ضمن الحد الآمن</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product) => {
            const level = getStockLevel(product);
            return (
              <div
                key={product.id}
                className={clsx(
                  'bg-white rounded-xl shadow-card p-5 border-r-4 transition-shadow hover:shadow-card-hover',
                  level === 'critical' ? 'border-red-500' : 'border-amber-400'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      size={20}
                      className={level === 'critical' ? 'text-red-500' : 'text-amber-500'}
                    />
                    <span
                      className={clsx(
                        'text-xs font-semibold px-2 py-1 rounded-full',
                        level === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      )}
                    >
                      {level === 'critical' ? 'حرج' : 'منخفض'}
                    </span>
                  </div>
                  {product.color_code && (
                    <div
                      className="w-6 h-6 rounded-full border-2 border-gray-200"
                      style={{ backgroundColor: product.color_code }}
                      title={product.color_name || ''}
                    />
                  )}
                </div>

                <h3 className="font-bold text-gray-800 mb-1">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-3">
                  {product.sku_code}
                  {product.color_name && ` - ${product.color_name}`}
                </p>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">الكمية الحالية:</span>
                    <span
                      className={clsx(
                        'font-bold',
                        level === 'critical' ? 'text-red-600' : 'text-amber-600'
                      )}
                    >
                      {product.quantity_in_stock}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">حد التنبيه:</span>
                    <span className="font-semibold text-gray-700">{product.reorder_level}</span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={clsx(
                        'h-2 rounded-full transition-all',
                        level === 'critical' ? 'bg-red-500' : 'bg-amber-400'
                      )}
                      style={{
                        width: `${Math.min(100, (product.quantity_in_stock / Math.max(product.reorder_level, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Building2 size={14} />
                    <span>{(product as any).warehouse?.name}</span>
                  </div>
                  <Link
                    to={`/inventory/${product.id}/edit`}
                    className="text-sm text-gold-600 hover:text-gold-700 font-medium"
                  >
                    تعديل المنتج
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StockWarningsPage;
