import React, { useEffect, useState } from 'react';
import { Building2, Plus, Edit2, Trash2, X, MapPin, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Warehouse } from '../../types';
import toast from 'react-hot-toast';

const AdminWarehousesPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', code: '', address: '', phone: '' });
  const [counts, setCounts] = useState<Record<string, { products: number; employees: number }>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('warehouses').select('*').order('name');
      if (error) throw error;
      setWarehouses(data || []);

      const countMap: Record<string, { products: number; employees: number }> = {};
      for (const wh of data || []) {
        const [{ count: prodCount }, { count: empCount }] = await Promise.all([
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('warehouse_id', wh.id),
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('warehouse_id', wh.id).eq('role', 'EMPLOYEE'),
        ]);
        countMap[wh.id] = { products: prodCount || 0, employees: empCount || 0 };
      }
      setCounts(countMap);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (wh: Warehouse) => {
    setEditingId(wh.id);
    setForm({ name: wh.name, code: wh.code, address: wh.address || '', phone: wh.phone || '' });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const c = counts[id];
    if (c && (c.products > 0 || c.employees > 0)) {
      toast.error('لا يمكن حذف مخزن يحتوي على منتجات أو موظفين');
      return;
    }
    try {
      const { error } = await supabase.from('warehouses').delete().eq('id', id);
      if (error) throw error;
      toast.success('تم حذف المخزن');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء الحذف');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('الرجاء إدخال اسم ورمز المخزن');
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
      };

      if (editingId) {
        const { error } = await supabase.from('warehouses').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('تم تحديث المخزن');
      } else {
        const { error } = await supabase.from('warehouses').insert(payload);
        if (error) throw error;
        toast.success('تم إضافة المخزن');
      }

      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', code: '', address: '', phone: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة المخازن</h1>
          <p className="text-gray-500 mt-1">إدارة المخازن وصالات العرض</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setForm({ name: '', code: '', address: '', phone: '' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors"
        >
          <Plus size={20} />
          إضافة مخزن
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <div className="spinner mx-auto" />
          <p className="text-gray-500 mt-4">جاري التحميل...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map((wh) => {
            const c = counts[wh.id] || { products: 0, employees: 0 };
            return (
              <div key={wh.id} className="bg-white rounded-xl shadow-card p-6 hover:shadow-card-hover transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gold-100 flex items-center justify-center">
                      <Building2 size={24} className="text-gold-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{wh.name}</h3>
                      <span className="text-sm text-gray-500 font-mono">{wh.code}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(wh)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="تعديل">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(wh.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500" title="حذف">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {wh.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <MapPin size={14} />
                    <span>{wh.address}</span>
                  </div>
                )}

                {wh.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <Phone size={14} />
                    <span dir="ltr">{wh.phone}</span>
                  </div>
                )}

                <div className="flex gap-4 pt-3 border-t border-gray-100">
                  <div className="text-center flex-1">
                    <p className="text-2xl font-bold text-gray-800">{c.products}</p>
                    <p className="text-xs text-gray-500">منتج</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-2xl font-bold text-gray-800">{c.employees}</p>
                    <p className="text-xs text-gray-500">موظف</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editingId ? 'تعديل المخزن' : 'إضافة مخزن جديد'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم المخزن <span className="text-red-500">*</span>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رمز المخزن <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 font-mono"
                  placeholder="W1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">العنوان</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الهاتف</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">
                  إلغاء
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg">
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

export default AdminWarehousesPage;
