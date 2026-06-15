import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Palette, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';

interface ProductColor {
  id: string;
  name: string;
  hex_code: string;
  created_at: string;
}

const ColorsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', hex_code: '#C9A84C' });

  useEffect(() => {
    fetchColors();
  }, []);

  const fetchColors = async () => {
    setLoading(true);
    const { data } = await supabase.from('product_colors').select('*').order('name');
    setColors(data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('اسم اللون مطلوب'); return; }
    if (!user?.id) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('add_product_color', {
        p_user_id: user.id,
        p_name: form.name.trim(),
        p_hex_code: form.hex_code,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message);
      toast.success('تمت إضافة اللون');
      setColors((prev) => [...prev, data.color].sort((a, b) => a.name.localeCompare(b.name, 'ar')));
      setForm({ name: '', hex_code: '#C9A84C' });
      setShowModal(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`هل تريد حذف اللون "${name}"؟`)) return;
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.rpc('delete_product_color', {
        p_user_id: user.id,
        p_color_id: id,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message);
      toast.success('تم حذف اللون');
      setColors((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'حدث خطأ');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة الألوان</h1>
          <p className="text-gray-500 mt-1">الألوان المتاحة لإضافتها على المنتجات</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors"
        >
          <Plus size={20} />
          إضافة لون
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><div className="spinner mx-auto" /></div>
        ) : colors.length === 0 ? (
          <div className="p-12 text-center">
            <Palette size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">لا توجد ألوان مضافة بعد</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-6">
            {colors.map((color) => (
              <div
                key={color.id}
                className="group relative bg-gray-50 rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div
                  className="w-full h-20"
                  style={{ backgroundColor: color.hex_code }}
                />
                <div className="p-3">
                  <p className="font-semibold text-gray-800 text-sm truncate">{color.name}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{color.hex_code}</p>
                </div>
                <button
                  onClick={() => handleDelete(color.id, color.name)}
                  className="absolute top-2 left-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">إضافة لون جديد</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم اللون <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="مثال: أبيض لؤلؤي، رمادي داكن..."
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">لون التعريف (للعرض)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.hex_code}
                    onChange={(e) => setForm((f) => ({ ...f, hex_code: e.target.value }))}
                    className="w-14 h-10 rounded-lg border border-gray-300 cursor-pointer"
                  />
                  <div className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 font-mono text-sm text-gray-600">
                    {form.hex_code}
                  </div>
                </div>
                <div
                  className="mt-3 h-12 rounded-lg border border-gray-200"
                  style={{ backgroundColor: form.hex_code }}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 btn-gold rounded-lg disabled:opacity-60"
              >
                {saving ? <div className="spinner" /> : <Plus size={18} />}
                {saving ? 'جاري الحفظ...' : 'إضافة اللون'}
              </button>
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorsPage;
