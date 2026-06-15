import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Package,
  Edit,
  Eye,
  Filter,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore, canManageProducts, isEmployee } from '../../stores/authStore';
import type { Product, ProductCategory, Warehouse } from '../../types';
import clsx from 'clsx';

const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const canEdit = canManageProducts(user);

  useEffect(() => {
    fetchWarehouses();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory, selectedWarehouse]);

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name');
    setWarehouses(data || []);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('product_categories')
      .select('*')
      .order('name');
    setCategories(data || []);
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:product_categories(*),
          warehouse:warehouses(*)
        `)
        .order('name');

      // Apply warehouse filter for employees
      if (user?.warehouse_id && isEmployee(user)) {
        query = query.eq('warehouse_id', user.warehouse_id);
      } else if (selectedWarehouse) {
        query = query.eq('warehouse_id', selectedWarehouse);
      }

      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,sku_code.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, selectedWarehouse, user]);

  const getUnitLabel = (unit: string) => {
    const units: Record<string, string> = {
      piece: 'قطعة',
      box: 'صندوق',
      meter: 'متر',
      kg: 'كيلو',
    };
    return units[unit] || unit;
  };

  const isLowStock = (product: Product) =>
    product.quantity_in_stock <= product.reorder_level;

  return (
    <div className="space-y-4 lg:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-800">المخزون</h1>
          <p className="text-sm lg:text-base text-gray-500 mt-1">إدارة المنتجات والمخزون</p>
        </div>
        {canEdit && (
          <Link
            to="/inventory/add"
            className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors touch-manipulation"
          >
            <Plus size={20} />
            إضافة منتج
          </Link>
        )}
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search
              size={20}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الرمز..."
              className="w-full pr-10 pl-4 py-3 sm:py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200 text-base"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-lg border transition-colors touch-manipulation',
              showFilters
                ? 'border-gold-500 bg-gold-50 text-gold-700'
                : 'border-gray-300 hover:bg-gray-50'
            )}
          >
            <Filter size={20} />
            فلاتر
            <ChevronDown
              size={16}
              className={clsx('transition-transform', showFilters && 'rotate-180')}
            />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
            {/* Category filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الصنف
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
              >
                <option value="">كل الأصناف</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Warehouse filter (admin only) */}
            {!isEmployee(user) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المخزن
                </label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                >
                  <option value="">كل المخازن</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Products list */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="spinner mx-auto" />
            <p className="text-gray-500 mt-4">جاري التحميل...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 lg:p-12 text-center">
            <Package size={48} className="mx-auto text-gray-300" />
            <p className="text-gray-500 mt-4">لا توجد منتجات</p>
            {canEdit && (
              <Link
                to="/inventory/add"
                className="inline-flex items-center gap-2 mt-4 text-gold-600 hover:text-gold-700 touch-manipulation"
              >
                <Plus size={18} />
                إضافة منتج جديد
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-gray-100">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/inventory/${product.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isLowStock(product) && (
                          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                        )}
                        <h3 className="font-semibold text-gray-800 truncate">{product.name}</h3>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{product.sku_code}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {product.color_name && (
                          <div className="flex items-center gap-1">
                            {product.color_code && (
                              <div
                                className="w-4 h-4 rounded border border-gray-300"
                                style={{ backgroundColor: product.color_code }}
                              />
                            )}
                            <span className="text-xs text-gray-600">{product.color_name}</span>
                          </div>
                        )}
                        <span className={clsx(
                          'text-sm font-semibold',
                          isLowStock(product) ? 'text-red-600' : 'text-gray-800'
                        )}>
                          {product.quantity_in_stock} {getUnitLabel(product.unit)}
                        </span>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">{product.retail_price.toFixed(3)}</p>
                      <p className="text-xs text-gray-500">د.أ</p>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/inventory/${product.id}/edit`)}
                        className="flex-1 py-2 text-sm text-gold-600 bg-gold-50 rounded-lg hover:bg-gold-100 transition-colors touch-manipulation"
                      >
                        تعديل
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">المنتج</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">الرمز</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">اللون</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">الكمية</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">سعر المفرق</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">سعر الجملة</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">المخزن</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {isLowStock(product) && <AlertTriangle size={18} className="text-red-500" />}
                          <div>
                            <p className="font-medium text-gray-800">{product.name}</p>
                            {product.category && <p className="text-sm text-gray-500">{product.category.name}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-mono">{product.sku_code}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {product.color_code && (
                            <div className="w-5 h-5 rounded border border-gray-300" style={{ backgroundColor: product.color_code }} />
                          )}
                          <span className="text-gray-600">{product.color_name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx('font-semibold', isLowStock(product) ? 'text-red-600' : 'text-gray-800')}>
                          {product.quantity_in_stock} {getUnitLabel(product.unit)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-800">{product.retail_price.toFixed(3)} د.أ</td>
                      <td className="px-6 py-4 text-gray-800">
                        {product.wholesale_price ? `${product.wholesale_price.toFixed(3)} د.أ` : '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{product.warehouse?.name || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => navigate(`/inventory/${product.id}`)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="عرض">
                            <Eye size={18} />
                          </button>
                          {canEdit && (
                            <button onClick={() => navigate(`/inventory/${product.id}/edit`)} className="p-2 rounded-lg hover:bg-gray-100 text-gold-600" title="تعديل">
                              <Edit size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InventoryPage;
