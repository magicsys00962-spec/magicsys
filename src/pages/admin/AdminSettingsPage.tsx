import React, { useEffect, useState } from 'react';
import { Settings, Save, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface SettingRow {
  id: string;
  setting_key: string;
  setting_value: string;
}

const SETTING_LABELS: Record<string, { label: string; description: string; type: 'text' | 'number' }> = {
  company_name: {
    label: 'اسم الشركة',
    description: 'يظهر في ترويسة الفواتير والتقارير',
    type: 'text',
  },
  company_phone: {
    label: 'هاتف الشركة',
    description: 'يظهر في الفواتير المطبوعة',
    type: 'text',
  },
  company_email: {
    label: 'البريد الإلكتروني',
    description: 'يظهر في ذيل الفواتير المطبوعة',
    type: 'text',
  },
  company_facebook: {
    label: 'صفحة فيسبوك',
    description: 'يظهر في ذيل الفواتير المطبوعة',
    type: 'text',
  },
  company_address: {
    label: 'عنوان الشركة',
    description: 'يظهر في الفواتير المطبوعة',
    type: 'text',
  },
  invoice_notes: {
    label: 'ملاحظات الفاتورة الافتراضية',
    description: 'تظهر في ذيل كل فاتورة مطبوعة',
    type: 'text',
  },
};

const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('system_settings').select('*');
      if (error) throw error;

      const map: Record<string, string> = {};
      (data as SettingRow[]).forEach((s) => {
        map[s.setting_key] = s.setting_value;
      });

      Object.keys(SETTING_LABELS).forEach((key) => {
        if (!(key in map)) map[key] = '';
      });

      setSettings(map);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        const { data: existing } = await supabase
          .from('system_settings')
          .select('id')
          .eq('setting_key', key)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('system_settings')
            .update({ setting_value: value, updated_at: new Date().toISOString() })
            .eq('setting_key', key);
        } else {
          await supabase
            .from('system_settings')
            .insert({ setting_key: key, setting_value: value });
        }
      }

      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إعدادات النظام</h1>
          <p className="text-gray-500 mt-1">الإعدادات العامة والافتراضية للنظام</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-card divide-y divide-gray-100">
        {Object.entries(SETTING_LABELS).map(([key, config]) => (
          <div key={key} className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-1">
                <Settings size={20} className="text-gray-500" />
              </div>
              <div className="flex-1">
                <label className="block font-semibold text-gray-800 mb-1">{config.label}</label>
                <p className="text-sm text-gray-500 mb-3">{config.description}</p>
                <input
                  type={config.type}
                  value={settings[key] || ''}
                  onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                  min={config.type === 'number' ? '0' : undefined}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSettingsPage;
