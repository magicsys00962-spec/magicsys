import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Save, Loader, Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { ProductCategory, Warehouse, ProductUnitRecord } from '../../types';
import toast from 'react-hot-toast';

interface ProductColor {
  id: string;
  name: string;
  hex_code: string;
}

interface WarehouseStock {
  warehouse_id: string;
  selected: boolean;
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
  const [productUnits, setProductUnits] = useState<ProductUnitRecord[]>([]);
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([]);

  const [showAddColor, setShowAddColor] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#CCCCCC');
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');

  const [form, setForm] = useState({
    name: '',
    sku_code: '',
    category_id: '',
    warehouse_id: user?.warehouse_id || '',
    color_code: '',
    color_name: '',
    quantity_in_stock: 0,
    unit: 'piece',
    retail_price: 0,
    wholesale_price: 0,
    craftsman_price: 0,
    minimum_price: 0,
    purchase_price: 0,
    reorder_level: 0,
    dimension_length: '',
    dimension_width: '',
    dimension_thickness: '',
  });

  useEffect(() => {
    fetchCategories();
    fetchWarehouses();
    fetchProductColors();
    fetchProductUnits();
    if (isEdit) fetchProduct();
  }, [id]);

  useEffect(() => {
    if (warehouses.length > 0 && !isEdit) {
      setWarehouseStocks(
        warehouses.map((wh) => ({
          warehouse_id: wh.id,
          selected: user?.warehouse_id ? wh.id === user.warehouse_id : false,
          quantity: 0,
        }))
      );
    }
  }, [warehouses, isEdit]);

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

  const fetchProductUnits = async () => {
    const { data } = await supabase.from('product_units').select('*').order('created_at');
    setProductUnits(data || []);
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
          purchase_price: Number(data.purchase_price) || 0,
          reorder_level: Number(data.reorder_level),
          dimension_length: data.dimension_length ? String(data.dimension_length) : '',
          dimension_width: data.dimension_width ? String(data.dimension_width) : '',
          dimension_thickness: data.dimension_thickness ? String(data.dimension_thickness) : '',
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

  const handleAddColor = async () => {
    if (!newColorName.trim()) return;
    try {
      const { data, error } = await supabase.rpc('add_product_color', {
        p_user_id: user?.id,
        p_name: newColorName.trim(),
        p_hex_code: newColorHex,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message);
      setProductColors([...productColors, data.color]);
      setForm({ ...form, color_name: data.color.name, color_code: data.color.hex_code });
      setNewColorName('');
      setNewColorHex('#CCCCCC');
      setShowAddColor(false);
      toast.success('تم إضافة اللون');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const handleAddUnit = async () => {
    if (!newUnitName.trim()) return;
    try {
      const { data, error } = await supabase.rpc('add_product_unit', {
        p_user_id: user?.id,
        p_name: newUnitName.trim(),
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message);
      setProductUnits([...productUnits, data.unit]);
      setForm({ ...form, unit: data.unit.name });
      setNewUnitName('');
      setShowAddUnit(false);
      toast.success('تم إضافة الوحدة');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!form.purchase_price || form.purchase_price <= 0) {
        throw new Error('الرجاء إدخال سعر الشراء');
      }

      if (isEdit) {
        const { error } = await supabase.from('products').update({
          name: form.name,
          sku_code: form.sku_code,
          category_id: form.category_id || null,
          warehouse_id: form.warehouse_id,
          color_code: form.color_code || null,
          color_name: form.color_name || null,
          quantity_in_stock: form.quantity_in_stock,
          unit: form.unit,
          retail_price: form.retail_price,
          wholesale_price: form.wholesale_price || null,
          craftsman_price: form.craftsman_price || null,
          minimum_price: form.minimum_price,
          purchase_price: form.purchase_price,
          reorder_level: form.reorder_level,
          dimension_length: form.dimension_length ? Number(form.dimension_length) : null,
          dimension_width: form.dimension_width ? Number(form.dimension_width) : null,
          dimension_thickness: form.dimension_thickness ? Number(form.dimension_thickness) : null,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
        if (error) throw error;
        toast.success('تم تحديث المنتج بنجاح');
        navigate('/inventory');
      } else {
        const selectedWarehouses = warehouseStocks.filter((ws) => ws.selected);
        if (selectedWarehouses.length === 0) {
          throw new Error('الرجاء اختيار مخزن واحد على الأقل');
        }

        for (const ws of selectedWarehouses) {
          const { error } = await supabase.from('products').insert({
            name: form.name,
            sku_code: form.sku_code,
            category_id: form.category_id || null,
            warehouse_id: ws.warehouse_id,
            color_code: form.color_code || null,
            color_name: form.color_name || null,
            quantity_in_stock: ws.quantity,
            unit: form.unit,
            retail_price: form.retail_price,
            wholesale_price: form.wholesale_price || null,
            craftsman_price: form.craftsman_price || null,
            minimum_price: form.minimum_price,
            purchase_price: form.purchase_price,
            reorder_level: form.reorder_level,
            dimension_length: form.dimension_length ? Number(form.dimension_length) : null,
            dimension_width: form.dimension_width ? Number(form.dimension_width) : null,
            dimension_thickness: form.dimension_thickness ? Number(form.dimension_thickness) : null,
          });
          if (error) throw error;
        }
        toast.success('تم إضافة المنتج بنجاح');
        navigate('/inventory');
      }
    } catch (error: unknown) {
      console.error('Error saving product:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const getUnitLabel = (name: string) => {
    const labels: Record<string, string> = { piece: 'قطعة', meter: 'متر', box: 'صندوق', kg: 'كيلو' };
    return labels[name] || name;
  };

  const handleNumberFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === '0') {
      e.target.select();
    }
  };

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
              <div className="flex gap-2">
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                  required
                >
                  {productUnits.map((u) => (
                    <option key={u.id} value={u.name}>{getUnitLabel(u.name)}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddUnit(true)}
                  className="px-3 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gold-600"
                  title="إضافة وحدة جديدة"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl shadow-card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">التسعير</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'purchase_price', label: 'سعر الشراء', required: true },
              { key: 'retail_price', label: 'سعر المفرق', required: true },
              { key: 'wholesale_price', label: 'سعر الجملة', required: false },
              { key: 'craftsman_price', label: 'سعر الصنايعي', required: false },
              { key: 'minimum_price', label: 'الحد الأدنى للسعر', required: true },
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
                  onFocus={handleNumberFocus}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                  required={required}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Dimensions (optional) */}
        <div className="bg-white rounded-xl shadow-card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">القياسات <span className="text-sm font-normal text-gray-400">(اختياري)</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الطول (سم)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.dimension_length}
                onChange={(e) => setForm({ ...form, dimension_length: e.target.value })}
                onFocus={handleNumberFocus}
                placeholder="—"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">العرض (سم)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.dimension_width}
                onChange={(e) => setForm({ ...form, dimension_width: e.target.value })}
                onFocus={handleNumberFocus}
                placeholder="—"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">السمك (سم)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.dimension_thickness}
                onChange={(e) => setForm({ ...form, dimension_thickness: e.target.value })}
                onFocus={handleNumberFocus}
                placeholder="—"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
              />
            </div>
          </div>
        </div>

        {/* Color selection */}
        <div className="bg-white rounded-xl shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">اللون <span className="text-sm font-normal text-gray-400">(اختياري)</span></h2>
            <button
              type="button"
              onClick={() => setShowAddColor(true)}
              className="flex items-center gap-1 text-sm text-gold-600 hover:text-gold-700 font-medium"
            >
              <Plus size={16} />
              لون جديد
            </button>
          </div>

          {showAddColor && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  placeholder="اسم اللون"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-1 focus:ring-gold-200 text-sm"
                />
                <input
                  type="color"
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <button type="button" onClick={handleAddColor} className="px-3 py-2 bg-gold-500 text-gray-900 rounded-lg text-sm font-semibold">
                  إضافة
                </button>
                <button type="button" onClick={() => setShowAddColor(false)} className="p-2 hover:bg-gray-200 rounded">
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
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
            {form.color_code && (
              <div
                className="w-10 h-10 rounded-lg border border-gray-300 flex-shrink-0"
                style={{ backgroundColor: form.color_code }}
              />
            )}
          </div>
        </div>

        {/* Warehouse + Quantity */}
        <div className="bg-white rounded-xl shadow-card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            {isEdit ? 'المخزن والكمية' : 'المخازن والكميات'}
          </h2>

          {isEdit ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">الكمية الحالية <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.quantity_in_stock}
                  onChange={(e) => setForm({ ...form, quantity_in_stock: Number(e.target.value) })}
                  onFocus={handleNumberFocus}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-3">اختر المخازن التي تريد إضافة المنتج فيها مع تحديد الكمية لكل مخزن</p>
              {warehouses.map((wh) => {
                const ws = warehouseStocks.find((s) => s.warehouse_id === wh.id);
                return (
                  <div key={wh.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 hover:border-gold-300 transition-colors">
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={ws?.selected || false}
                        onChange={(e) => {
                          setWarehouseStocks((prev) =>
                            prev.map((s) =>
                              s.warehouse_id === wh.id ? { ...s, selected: e.target.checked } : s
                            )
                          );
                        }}
                        className="w-5 h-5 rounded border-gray-300 text-gold-500 focus:ring-gold-200"
                      />
                      <span className="font-medium text-gray-700">{wh.name}</span>
                    </label>
                    {ws?.selected && (
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={ws.quantity}
                        onChange={(e) => {
                          setWarehouseStocks((prev) =>
                            prev.map((s) =>
                              s.warehouse_id === wh.id ? { ...s, quantity: Number(e.target.value) } : s
                            )
                          );
                        }}
                        onFocus={handleNumberFocus}
                        placeholder="الكمية"
                        className="w-32 px-3 py-2 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-1 focus:ring-gold-200 text-center"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

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

      {/* Add Unit Modal */}
      {showAddUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddUnit(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">إضافة وحدة قياس جديدة</h3>
            <input
              type="text"
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              placeholder="اسم الوحدة (مثال: لفة، كرتون...)"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200 mb-4"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUnit())}
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowAddUnit(false)} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
                إلغاء
              </button>
              <button type="button" onClick={handleAddUnit} className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg">
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductFormPage;
