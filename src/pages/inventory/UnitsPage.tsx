import React, { useEffect, useState } from 'react';
import { Ruler, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore, isAdmin } from '../../stores/authStore';
import type { ProductUnitRecord } from '../../types';
import toast from 'react-hot-toast';

const UnitsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [units, setUnits] = useState<ProductUnitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_units')
        .select('*')
        .order('created_at');
      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error('الرجاء إدخال اسم الوحدة');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('add_product_unit', {
        p_user_id: user?.id,
        p_name: newName.trim(),
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message);
      setUnits([...units, data.unit]);
      setNewName('');
      setShowForm(false);
      toast.success('تم إضافة الوحدة بنجاح');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (unitId: string, unitName: string) => {
    if (!confirm(`هل تريد حذف الوحدة "${unitName}"؟`)) return;
    try {
      const { data, error } = await supabase.rpc('delete_product_unit', {
        p_user_id: user?.id,
        p_unit_id: unitId,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message);
      setUnits(units.filter((u) => u.id !== unitId));
      toast.success('تم حذف الوحدة');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const getUnitLabel = (name: string) => {
    const labels: Record<string, string> = {
      piece: 'قطعة',
      meter: 'متر',
      box: 'صندوق',
      kg: 'كيلو',
    };
    return labels[name] || name;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة الوحدات</h1>
          <p className="text-gray-500 mt-1">إدارة وحدات القياس المستخدمة في المنتجات</p>
        </div>
        {isAdmin(user) && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors"
          >
            <Plus size={20} />
            إضافة وحدة
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">وحدة جديدة</h2>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded">
              <X size={20} />
            </button>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="اسم الوحدة (مثال: لفة، كرتون...)"
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'جاري الحفظ...' : 'إضافة'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="spinner mx-auto" />
            <p className="text-gray-500 mt-4">جاري التحميل...</p>
          </div>
        ) : units.length === 0 ? (
          <div className="p-12 text-center">
            <Ruler size={48} className="mx-auto text-gray-300" />
            <p className="text-gray-500 mt-4">لا توجد وحدات</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {units.map((unit) => (
              <div key={unit.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center">
                    <Ruler size={18} className="text-gold-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{getUnitLabel(unit.name)}</p>
                    <p className="text-sm text-gray-500">{unit.name}</p>
                  </div>
                </div>
                {isAdmin(user) && (
                  <button
                    onClick={() => handleDelete(unit.id, unit.name)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                    title="حذف"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnitsPage;
