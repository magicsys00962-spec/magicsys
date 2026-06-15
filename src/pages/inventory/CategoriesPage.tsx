import React, { useEffect, useState } from 'react';
import { FolderTree, Plus, Edit2, Trash2, X, ChevronDown, ChevronLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ProductCategory, Warehouse } from '../../types';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', parent_id: '', warehouse_id: '' });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: catData }, { data: whData }] = await Promise.all([
        supabase.from('product_categories').select('*').order('name'),
        supabase.from('warehouses').select('*').order('name'),
      ]);
      setCategories(catData || []);
      setWarehouses(whData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const topLevel = categories.filter((c) => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEdit = (cat: ProductCategory) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, parent_id: cat.parent_id || '', warehouse_id: cat.warehouse_id || '' });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const children = getChildren(id);
    if (children.length > 0) {
      toast.error('لا يمكن حذف صنف يحتوي على أصناف فرعية');
      return;
    }

    try {
      const { error } = await supabase.from('product_categories').delete().eq('id', id);
      if (error) throw error;
      toast.success('تم حذف الصنف');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء الحذف');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('الرجاء إدخال اسم الصنف');
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        parent_id: form.parent_id || null,
        warehouse_id: form.warehouse_id || null,
      };

      if (editingId) {
        const { error } = await supabase.from('product_categories').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('تم تحديث الصنف');
      } else {
        const { error } = await supabase.from('product_categories').insert(payload);
        if (error) throw error;
        toast.success('تم إضافة الصنف');
      }

      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', parent_id: '', warehouse_id: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const renderCategory = (cat: ProductCategory, depth: number = 0) => {
    const children = getChildren(cat.id);
    const isExpanded = expandedIds.has(cat.id);
    const hasChildren = children.length > 0;

    return (
      <div key={cat.id}>
        <div
          className={clsx(
            'flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors border-b border-gray-100',
            depth > 0 && 'bg-gray-50/50'
          )}
          style={{ paddingRight: `${16 + depth * 24}px` }}
        >
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button onClick={() => toggleExpand(cat.id)} className="p-1 hover:bg-gray-200 rounded">
                {isExpanded ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
              </button>
            ) : (
              <span className="w-7" />
            )}
            <FolderTree size={18} className={depth === 0 ? 'text-gold-500' : 'text-gray-400'} />
            <span className="font-medium text-gray-800">{cat.name}</span>
            {hasChildren && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {children.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 ml-3">
              {warehouses.find((w) => w.id === cat.warehouse_id)?.name || 'الكل'}
            </span>
            <button
              onClick={() => handleEdit(cat)}
              className="p-2 rounded-lg hover:bg-gray-200 text-gray-500"
              title="تعديل"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => handleDelete(cat.id)}
              className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500"
              title="حذف"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        {isExpanded && children.map((child) => renderCategory(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة الأصناف</h1>
          <p className="text-gray-500 mt-1">إدارة أصناف وتصنيفات المنتجات</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setForm({ name: '', parent_id: '', warehouse_id: '' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors"
        >
          <Plus size={20} />
          إضافة صنف
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <div className="spinner mx-auto" />
          <p className="text-gray-500 mt-4">جاري التحميل...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <FolderTree size={48} className="mx-auto text-gray-300" />
          <p className="text-gray-500 mt-4">لا توجد أصناف</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">اسم الصنف</span>
            <span className="text-sm font-semibold text-gray-600">إجراءات</span>
          </div>
          {topLevel.map((cat) => renderCategory(cat))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editingId ? 'تعديل الصنف' : 'إضافة صنف جديد'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم الصنف <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الصنف الأب</label>
                <select
                  value={form.parent_id}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                >
                  <option value="">بدون (صنف رئيسي)</option>
                  {categories
                    .filter((c) => c.id !== editingId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المخزن</label>
                <select
                  value={form.warehouse_id}
                  onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                >
                  <option value="">جميع المخازن</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg"
                >
                  {editingId ? 'تحديث' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
