import React, { useEffect, useState } from 'react';
import { DollarSign, Search, Save, Tag, Edit2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Product, Warehouse } from '../../types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface PriceTier {
  id: string;
  name: string;
  description: string | null;
}

const AdminPricingPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [priceForm, setPriceForm] = useState({
    retail_price: 0,
    wholesale_price: 0,
    craftsman_price: 0,
    minimum_price: 0,
    wholesale_threshold: 1,
  });
  const [showTierForm, setShowTierForm] = useState(false);
  const [tierForm, setTierForm] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: prodData }, { data: whData }, { data: tierData }] = await Promise.all([
        supabase.from('products').select('*, warehouse:warehouses(name), category:product_categories(name)').order('name'),
        supabase.from('warehouses').select('*').order('name'),
        supabase.from('price_tiers').select('*').order('name'),
      ]);
      setProducts(prodData || []);
      setWarehouses(whData || []);
      setPriceTiers(tierData || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = products.filter((p) => {
    const matchesSearch = !search || p.name.includes(search) || p.sku_code.toLowerCase().includes(search.toLowerCase());
    const matchesWh = !warehouseFilter || p.warehouse_id === warehouseFilter;
    return matchesSearch && matchesWh;
  });

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product.id);
    setPriceForm({
      retail_price: product.retail_price,
      wholesale_price: product.wholesale_price || 0,
      craftsman_price: product.craftsman_price || 0,
      minimum_price: product.minimum_price,
      wholesale_threshold: product.wholesale_threshold,
    });
  };

  const handleSavePrice = async (productId: string) => {
    if (priceForm.minimum_price > priceForm.retail_price) {
      toast.error('الحد الأدنى لا يمكن أن يتجاوز سعر المفرق');
      return;
    }

    setSaving(productId);
    try {
      const { error } = await supabase
        .from('products')
        .update({
          retail_price: priceForm.retail_price,
          wholesale_price: priceForm.wholesale_price || null,
          craftsman_price: priceForm.craftsman_price || null,
          minimum_price: priceForm.minimum_price,
          wholesale_threshold: priceForm.wholesale_threshold,
        })
        .eq('id', productId);

      if (error) throw error;
      toast.success('تم تحديث الأسعار');
      setEditingProduct(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    } finally {
      setSaving(null);
    }
  };

  const handleAddTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierForm.name.trim()) {
      toast.error('الرجاء إدخال اسم الفئة');
      return;
    }
    try {
      const { error } = await supabase.from('price_tiers').insert({
        name: tierForm.name.trim(),
        description: tierForm.description.trim() || null,
      });
      if (error) throw error;
      toast.success('تم إضافة فئة السعر');
      setShowTierForm(false);
      setTierForm({ name: '', description: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة الأسعار</h1>
          <p className="text-gray-500 mt-1">ضبط أسعار المنتجات وفئات الصنايعية</p>
        </div>
      </div>

      {/* Price Tiers */}
      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Tag size={20} className="text-gold-500" />
            فئات أسعار الصنايعية
          </h2>
          <button
            onClick={() => setShowTierForm(true)}
            className="text-sm text-gold-600 hover:text-gold-700 font-medium"
          >
            + إضافة فئة
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          {priceTiers.map((tier) => (
            <div key={tier.id} className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <p className="font-semibold text-gray-800">{tier.name}</p>
              {tier.description && <p className="text-xs text-gray-500">{tier.description}</p>}
            </div>
          ))}
          {priceTiers.length === 0 && <p className="text-gray-400 text-sm">لا توجد فئات أسعار</p>}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الرمز..."
              className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
            />
          </div>
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-gray-300"
          >
            <option value="">كل المخازن</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Pricing Table */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <div className="spinner mx-auto" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">المنتج</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">المفرق</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الجملة</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الصنايعي</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الحد الأدنى</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">حد الجملة</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((product) => (
                  <tr key={product.id} className={clsx('hover:bg-gray-50', editingProduct === product.id && 'bg-gold-50')}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.sku_code} - {(product as any).warehouse?.name}</p>
                    </td>

                    {editingProduct === product.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={priceForm.retail_price}
                            onChange={(e) => setPriceForm({ ...priceForm, retail_price: Number(e.target.value) })}
                            className="w-24 px-2 py-1.5 rounded border border-gray-300 text-sm"
                            step="0.001"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={priceForm.wholesale_price}
                            onChange={(e) => setPriceForm({ ...priceForm, wholesale_price: Number(e.target.value) })}
                            className="w-24 px-2 py-1.5 rounded border border-gray-300 text-sm"
                            step="0.001"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={priceForm.craftsman_price}
                            onChange={(e) => setPriceForm({ ...priceForm, craftsman_price: Number(e.target.value) })}
                            className="w-24 px-2 py-1.5 rounded border border-gray-300 text-sm"
                            step="0.001"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={priceForm.minimum_price}
                            onChange={(e) => setPriceForm({ ...priceForm, minimum_price: Number(e.target.value) })}
                            className="w-24 px-2 py-1.5 rounded border border-red-300 text-sm"
                            step="0.001"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={priceForm.wholesale_threshold}
                            onChange={(e) => setPriceForm({ ...priceForm, wholesale_threshold: Number(e.target.value) })}
                            className="w-20 px-2 py-1.5 rounded border border-gray-300 text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleSavePrice(product.id)}
                              disabled={saving === product.id}
                              className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              onClick={() => setEditingProduct(null)}
                              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium">{product.retail_price.toFixed(3)} <span className="text-xs text-gray-400">د.أ</span></td>
                        <td className="px-4 py-3 text-blue-600">{product.wholesale_price?.toFixed(3) || '-'}</td>
                        <td className="px-4 py-3 text-purple-600">{product.craftsman_price?.toFixed(3) || '-'}</td>
                        <td className="px-4 py-3 text-red-600 font-semibold">{product.minimum_price.toFixed(3)}</td>
                        <td className="px-4 py-3 text-gray-600">{product.wholesale_threshold}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                            title="تعديل الأسعار"
                          >
                            <Edit2 size={16} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showTierForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">إضافة فئة سعر</h3>
              <button onClick={() => setShowTierForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddTier} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم الفئة</label>
                <input
                  type="text"
                  value={tierForm.name}
                  onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الوصف</label>
                <input
                  type="text"
                  value={tierForm.description}
                  onChange={(e) => setTierForm({ ...tierForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowTierForm(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">
                  إلغاء
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg">
                  إضافة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPricingPage;
