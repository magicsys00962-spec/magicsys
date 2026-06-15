import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Save, Loader, Plus, Trash2, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { ProductCategory, Warehouse } from '../../types';
import toast from 'react-hot-toast';

interface ProductColor {
  id: string;
  name: string;
  hex_code: string;
}

interface ColorVariant {
  color_id: string;
  color_name: string;
  hex_code: string;
  warehouse_id: string;
  quantity: number;
}

const ProductFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuthStore();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [productColors, setProductColors] = useState<ProductColor[]>([]);

  // Color variants for new product
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);

  const [form, setForm] = useState({
    name: '',
    sku_code: '',
    category_id: '',
    warehouse_id: user?.warehouse_id || '',
    color_code: '',
    color_name: '',
    quantity_in_stock: 0,
    unit: 'box' as 'piece' | 'box' | 'meter' | 'kg',
    retail_price: 0,
    wholesale_price: 0,
    craftsman_price: 0,
    minimum_price: 0,
    wholesale_threshold: 1,
    reorder_level: 0,
  });

  useEffect(() => {
    fetchCategories();
    fetchWarehouses();
    fetchProductColors();
    if (isEdit) fetchProduct();
  }, [id]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('product_categories').select('*').order('name');
    setCategories(data || []);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name');
    setWarehouses(data || []);
  };

  const fetchProductColors = async () => {
    const { data } = await supabase.from('product_colors').select('*').order('name');
    setProductColors(data || []);
  };

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
      if (error) throw error;
      if (data) {
        setForm({
          name: data.name,
          sku_code: data.sku_code,
          category_id: data.category_id || '',
          warehouse_id: data.warehouse_id,
          color_code: data.color_code || '',
          color_name: data.color_name || '',
          quantity_in_stock: Number(data.quantity_in_stock),
          unit: data.unit,
          retail_price: Number(data.retail_price),
          wholesale_price: Number(data.wholesale_price) || 0,
          craftsman_price: Number(data.craftsman_price) || 0,
          minimum_price: Number(data.minimum_price),
          wholesale_threshold: Number(data.wholesale_threshold),
          reorder_level: Number(data.reorder_level),
        });
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('لم يتم العثور على المنتج');
      navigate('/inventory');
    } finally {
      setLoading(false);
    }
  };

  const toggleColorVariant = (color: ProductColor, warehouseId: string) => {
    const key = `${color.id}_${warehouseId}`;
    const existing = colorVariants.find((v) => v.color_id === color.id && v.warehouse_id === warehouseId);
    if (existing) {
      setColorVariants((prev) => prev.filter((v) => !(v.color_id === color.id && v.warehouse_id === warehouseId)));
    } else {
      setColorVariants((prev) => [...prev, {
        color_id: color.id,
        color_name: color.name,
        hex_code: color.hex_code,
        warehouse_id: warehouseId,
        quantity: 0,
      }]);
    }
    void key;
  };

  const updateVariantQuantity = (colorId: string, warehouseId: string, quantity: number) => {
    setColorVariants((prev) =>
      prev.map((v) =>
        v.color_id === colorId && v.warehouse_id === warehouseId ? { ...v, quantity } : v
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isEdit) {
        // Edit mode: update single product record
        const { error } = await supabase.from('products').update({
          ...form,
          wholesale_price: form.wholesale_price || null,
          craftsman_price: form.craftsman_price || null,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
        if (error) throw error;
        toast.success('تم تحديث المنتج بنجاح');
        navigate('/inventory');
      } else {
        // New product: use color variants if any selected
        if (colorVariants.length > 0) {
          const { data, error } = await supabase.rpc('add_product_with_colors', {
            p_user_id: user?.id,
            p_name: form.name,
            p_sku_code: form.sku_code,
            p_category_id: form.category_id || null,
            p_unit: form.unit,
            p_retail_price: form.retail_price,
            p_wholesale_price: form.wholesale_price || null,
            p_craftsman_price: form.craftsman_price || null,
            p_minimum_price: form.minimum_price,
            p_wholesale_threshold: form.wholesale_threshold,
            p_reorder_level: form.reorder_level,
            p_color_variants: colorVariants.map((v) => ({
              color_id: v.color_id,
              color_name: v.color_name,
              hex_code: v.hex_code,
              warehouse_id: v.warehouse_id,
              quantity: v.quantity,
            })),
          });
          if (error) throw error;
          if (!data?.success) throw new Error(data?.message);
          toast.success(`تم إضافة ${colorVariants.length} نسخة من المنتج بنجاح`);
        } else {
          // Single product without colors
          const { error } = await supabase.from('products').insert({
            ...form,
            wholesale_price: form.wholesale_price || null,
            craftsman_price: form.craftsman_price || null,
          });
          if (error) throw error;
          toast.success('تم إضافة المنتج بنجاح');
        }
        navigate('/inventory');
      }
    } catch (error: unknown) {
      console.error('Error saving product:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const unitOptions = [
    { value: 'piece', label: 'قطعة' },
    { value: 'box', label: 'صندوق' },
    { value: 'meter', label: 'متر' },
    { value: 'kg', label: 'كيلو' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin text-gold-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/inventory')} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowRight size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{isEdit ? 'تعديل منتج' : 'إضافة منتج جديد'}</h1>
          <p className="text-gray-500">{isEdit ? 'قم بتعديل بيانات المنتج' : 'أدخل بيانات المنتج الجديد'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="bg-white rounded-xl shadow-card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">معلومات أساسية</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المنتج <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رمز المنتج (SKU) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.sku_code}
                onChange={(e) => setForm({ ...form, sku_code: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الصنف</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
              >
                <option value="">بدون صنف</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الوحدة <span className="text-red-500">*</span></label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value as typeof form.unit })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                required
              >
                {unitOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl shadow-card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">التسعير</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'retail_price', label: 'سعر المفرق', required: true },
              { key: 'wholesale_price', label: 'سعر الجملة', required: false },
              { key: 'craftsman_price', label: 'سعر الصنايعي', required: false },
              { key: 'minimum_price', label: 'الحد الأدنى للسعر', required: true },
              { key: 'wholesale_threshold', label: 'حد الجملة (الكمية)', required: false },
              { key: 'reorder_level', label: 'حد التنبيه', required: false },
            ].map(({ key, label, required }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {label} {required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={form[key as keyof typeof form] as number}
                  onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                  required={required}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Color + Warehouse variants (new product only) */}
        {!isEdit && (
          <div className="bg-white rounded-xl shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">الألوان والمخازن</h2>
                <p className="text-sm text-gray-500 mt-1">
                  اختر لون ومخزن وأدخل الكمية لكل مجموعة. كل اختيار سيكون سجلاً منفصلاً في المخزون.
                </p>
              </div>
              {colorVariants.length > 0 && (
                <span className="bg-gold-100 text-gold-700 text-sm font-semibold px-3 py-1 rounded-full">
                  {colorVariants.length} نسخة
                </span>
              )}
            </div>

            {productColors.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <p>لا توجد ألوان مضافة للنظام بعد.</p>
                <button
                  type="button"
                  onClick={() => navigate('/inventory/colors')}
                  className="mt-2 text-gold-600 font-medium hover:underline"
                >
                  اذهب لإضافة ألوان →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {warehouses.map((wh) => (
                  <div key={wh.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-700">{wh.name}</h3>
                    </div>
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {productColors.map((color) => {
                        const selected = colorVariants.find(
                          (v) => v.color_id === color.id && v.warehouse_id === wh.id
                        );
                        return (
                          <div key={color.id} className="space-y-1.5">
                            <button
                              type="button"
                              onClick={() => toggleColorVariant(color, wh.id)}
                              className={`w-full flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all text-sm ${
                                selected
                                  ? 'border-gold-500 bg-gold-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div
                                className="w-5 h-5 rounded-full flex-shrink-0 border border-gray-300"
                                style={{ backgroundColor: color.hex_code }}
                              />
                              <span className="font-medium truncate text-gray-700">{color.name}</span>
                              {selected && <Check size={14} className="text-gold-600 mr-auto flex-shrink-0" />}
                            </button>
                            {selected && (
                              <input
                                type="number"
                                step="0.001"
                                min="0"
                                placeholder="الكمية"
                                value={selected.quantity}
                                onChange={(e) => updateVariantQuantity(color.id, wh.id, Number(e.target.value))}
                                className="w-full px-2 py-1.5 text-sm rounded-lg border border-gold-300 focus:border-gold-500 focus:ring-1 focus:ring-gold-200 text-center"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {colorVariants.length === 0 && productColors.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
                <p className="text-gray-500 text-sm">لم يتم اختيار أي لون — سيتم إضافة المنتج بدون تحديد لون</p>
                <p className="text-xs text-gray-400 mt-1">يمكنك تحديد المخزن والكمية في الأسفل</p>
              </div>
            )}

            {/* Fallback: single warehouse + quantity when no colors selected */}
            {colorVariants.length === 0 && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المخزن <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.warehouse_id}
                    onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                    required={colorVariants.length === 0}
                    disabled={!!user?.warehouse_id}
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">اللون (اختياري)</label>
                  <div className="flex gap-2">
                    {productColors.length > 0 ? (
                      <select
                        value={form.color_name}
                        onChange={(e) => {
                          const c = productColors.find((p) => p.name === e.target.value);
                          setForm({ ...form, color_name: e.target.value, color_code: c?.hex_code || '' });
                        }}
                        className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                      >
                        <option value="">بدون لون</option>
                        {productColors.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={form.color_name}
                        onChange={(e) => setForm({ ...form, color_name: e.target.value })}
                        className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                        placeholder="اسم اللون"
                      />
                    )}
                    {form.color_code && (
                      <div
                        className="w-10 h-10 rounded-lg border border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: form.color_code }}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الكمية الحالية <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={form.quantity_in_stock}
                    onChange={(e) => setForm({ ...form, quantity_in_stock: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                    required={colorVariants.length === 0}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit mode: single color/warehouse/stock fields */}
        {isEdit && (
          <div className="bg-white rounded-xl shadow-card p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">اللون والمخزن</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المخزن</label>
                <select
                  value={form.warehouse_id}
                  onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                  disabled={!!user?.warehouse_id}
                >
                  {warehouses.map((wh) => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اللون</label>
                <div className="flex gap-2">
                  {productColors.length > 0 ? (
                    <select
                      value={form.color_name}
                      onChange={(e) => {
                        const c = productColors.find((p) => p.name === e.target.value);
                        setForm({ ...form, color_name: e.target.value, color_code: c?.hex_code || '' });
                      }}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                    >
                      <option value="">بدون لون</option>
                      {productColors.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={form.color_name}
                      onChange={(e) => setForm({ ...form, color_name: e.target.value })}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                    />
                  )}
                  {form.color_code && (
                    <div className="w-10 h-10 rounded-lg border border-gray-300 flex-shrink-0" style={{ backgroundColor: form.color_code }} />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الكمية الحالية <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.quantity_in_stock}
                  onChange={(e) => setForm({ ...form, quantity_in_stock: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-4 pb-4">
          <button
            type="button"
            onClick={() => navigate('/inventory')}
            className="px-6 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductFormPage;
