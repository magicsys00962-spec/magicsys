import React, { useEffect, useState } from 'react';
import { FolderTree, Plus, Edit2, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ProductCategory } from '../../types';
import toast from 'react-hot-toast';

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('product_categories').select('*').order('name');
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cat: ProductCategory) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا الصنف؟')) return;
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
    if (!formName.trim()) {
      toast.error('الرجاء إدخال اسم الصنف');
      return;
    }

    try {
      const payload = { name: formName.trim() };

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
      setFormName('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
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
            setFormName('');
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
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">اسم الصنف</span>
            <span className="text-sm font-semibold text-gray-600">إجراءات</span>
          </div>
          <div className="divide-y divide-gray-100">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <FolderTree size={18} className="text-gold-500" />
                  <span className="font-medium text-gray-800">{cat.name}</span>
                </div>
                <div className="flex items-center gap-1">
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
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
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
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                  required
                  autoFocus
                />
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
