import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Package,
  Edit,
  Eye,
  Filter,
  ChevronDown,
  AlertTriangle,
  Trash2,
  Archive,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore, canManageProducts, isEmployee } from '../../stores/authStore';
import type { Product, ProductCategory, Warehouse } from '../../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

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
  const [deleteModal, setDeleteModal] = useState<{ product: Product; mode: 'delete' | 'archive' } | null>(null);

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
    const { data } = await supabase.from('product_categories').select('*').order('name');
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
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

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

  const handleDeleteOrArchive = async (product: Product, mode: 'delete' | 'archive') => {
    try {
      const { data, error } = await supabase.rpc('delete_or_archive_product', {
        p_user_id: user?.id,
        p_product_id: product.id,
        p_mode: mode,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message);
      toast.success(data.message);
      setProducts(products.filter((p) => p.id !== product.id));
      setDeleteModal(null);
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

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
      </div>

      {/* Search and filters */}
      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
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

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الصنف</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
              >
                <option value="">كل الأصناف</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            {!isEmployee(user) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المخزن</label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                >
                  <option value="">كل المخازن</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
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
                          'text-sm font-bold px-2 py-0.5 rounded',
                          isLowStock(product) ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50'
                        )}>
                          {product.quantity_in_stock} {getUnitLabel(product.unit)}
                        </span>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">{Number(product.retail_price).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">د.أ</p>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/inventory/${product.id}/edit`)}
                        className="flex-1 py-2 text-sm text-gold-600 bg-gold-50 rounded-lg hover:bg-gold-100 transition-colors"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => setDeleteModal({ product, mode: 'archive' })}
                        className="py-2 px-3 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={16} />
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
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">الكمية المتوفرة</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">سعر الشراء</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">سعر المفرق</th>
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
                        <span className={clsx(
                          'font-bold px-2 py-1 rounded text-sm',
                          isLowStock(product) ? 'text-red-700 bg-red-50' : 'text-green-700 bg-green-50'
                        )}>
                          {product.quantity_in_stock} {getUnitLabel(product.unit)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-800">{Number(product.purchase_price || 0).toFixed(2)} د.أ</td>
                      <td className="px-6 py-4 text-gray-800">{Number(product.retail_price).toFixed(2)} د.أ</td>
                      <td className="px-6 py-4 text-gray-600">{product.warehouse?.name || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`/inventory/${product.id}`)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="عرض">
                            <Eye size={18} />
                          </button>
                          {canEdit && (
                            <>
                              <button onClick={() => navigate(`/inventory/${product.id}/edit`)} className="p-2 rounded-lg hover:bg-gray-100 text-gold-600" title="تعديل">
                                <Edit size={18} />
                              </button>
                              <button onClick={() => setDeleteModal({ product, mode: 'archive' })} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="حذف/أرشفة">
                                <Trash2 size={18} />
                              </button>
                            </>
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

      {/* Delete/Archive Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteModal(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-2">حذف المنتج</h3>
            <p className="text-gray-600 mb-1">
              <span className="font-semibold">{deleteModal.product.name}</span>
            </p>
            <p className="text-sm text-gray-500 mb-6">اختر طريقة الحذف:</p>

            <div className="space-y-3">
              <button
                onClick={() => handleDeleteOrArchive(deleteModal.product, 'archive')}
                className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-amber-200 bg-amber-50 hover:border-amber-400 transition-colors text-right"
              >
                <Archive size={20} className="text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-800">إضافة للأرشيف</p>
                  <p className="text-xs text-gray-500">يتم إخفاء المنتج مع الاحتفاظ بالبيانات</p>
                </div>
              </button>
              <button
                onClick={() => handleDeleteOrArchive(deleteModal.product, 'delete')}
                className="w-full flex items-center gap-3 p-4 rounded-lg border-2 border-red-200 bg-red-50 hover:border-red-400 transition-colors text-right"
              >
                <Trash2 size={20} className="text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-800">حذف نهائي</p>
                  <p className="text-xs text-gray-500">يتم حذف المنتج نهائياً (الفواتير المرتبطة لن تتأثر)</p>
                </div>
              </button>
            </div>

            <button
              onClick={() => setDeleteModal(null)}
              className="w-full mt-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
