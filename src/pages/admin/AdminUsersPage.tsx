import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit, UserCog, Shield, Wrench, Users as UsersIcon, Key, X, Eye, EyeOff, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { User, Warehouse, UserPermissions, PermissionKey } from '../../types';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const PERMISSION_SECTIONS: { key: PermissionKey; label: string; group: string }[] = [
  { key: 'dashboard', label: 'لوحة التحكم', group: 'عام' },
  { key: 'inventory', label: 'عرض المخزون', group: 'المخزون' },
  { key: 'inventory_add', label: 'إضافة / تعديل المنتجات', group: 'المخزون' },
  { key: 'inventory_warnings', label: 'تنبيهات المخزون', group: 'المخزون' },
  { key: 'inventory_categories', label: 'إدارة الأصناف والألوان والوحدات', group: 'المخزون' },
  { key: 'inventory_transfer', label: 'نقل المنتجات', group: 'المخزون' },
  { key: 'stock_requests', label: 'طلبات المواد بين المخازن', group: 'المخزون' },
  { key: 'stock_lookup', label: 'البحث عن مادة', group: 'المخزون' },
  { key: 'sales', label: 'عرض الفواتير', group: 'المبيعات' },
  { key: 'sales_create', label: 'إنشاء فاتورة جديدة', group: 'المبيعات' },
  { key: 'returns', label: 'إرجاع الفواتير', group: 'المبيعات' },
  { key: 'customers', label: 'عرض الزباين', group: 'الزباين' },
  { key: 'customers_craftsmen', label: 'إدارة الصنايعية', group: 'الزباين' },
  { key: 'customers_add', label: 'إضافة زبون', group: 'الزباين' },
  { key: 'projects', label: 'المشاريع', group: 'قسم التنفيذ' },
  { key: 'projects_inspections', label: 'طلبات الكشف', group: 'قسم التنفيذ' },
  { key: 'reports', label: 'التقارير', group: 'التقارير' },
  { key: 'reports_profits', label: 'تقرير الأرباح', group: 'التقارير' },
  { key: 'admin_users', label: 'إدارة المستخدمين', group: 'الإعدادات' },
  { key: 'admin_warehouses', label: 'إدارة المخازن', group: 'الإعدادات' },
  { key: 'admin_pricing', label: 'إدارة الأسعار', group: 'الإعدادات' },
  { key: 'admin_settings', label: 'إعدادات النظام', group: 'الإعدادات' },
];

const ALL_PERMISSION_KEYS = PERMISSION_SECTIONS.map((s) => s.key);

function getGrouped() {
  const groups: Record<string, typeof PERMISSION_SECTIONS> = {};
  PERMISSION_SECTIONS.forEach((s) => {
    if (!groups[s.group]) groups[s.group] = [];
    groups[s.group].push(s);
  });
  return groups;
}

const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'EMPLOYEE' as User['role'],
    warehouse_id: '',
    phone: '',
    permissions: {} as UserPermissions,
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<User | null>(null);
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showFormPassword, setShowFormPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchWarehouses();
  }, [search, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('users')
        .select('*, warehouse:warehouses(id, name)')
        .order('created_at', { ascending: false });

      if (roleFilter) query = query.eq('role', roleFilter);
      if (search) query = query.or(`name.ilike.%${search}%,username.ilike.%${search}%`);

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name');
    setWarehouses(data || []);
  };

  const getRoleConfig = (role: User['role']) => {
    switch (role) {
      case 'ADMIN': return { label: 'مدير النظام', icon: Shield, color: 'bg-red-100 text-red-700' };
      case 'EMPLOYEE': return { label: 'موظف', icon: UserCog, color: 'bg-blue-100 text-blue-700' };
      case 'CRAFTSMAN': return { label: 'صنايعي', icon: UsersIcon, color: 'bg-purple-100 text-purple-700' };
      case 'PROJECT_MANAGER': return { label: 'مدير مشاريع', icon: Wrench, color: 'bg-green-100 text-green-700' };
      default: return { label: role, icon: UserCog, color: 'bg-gray-100 text-gray-700' };
    }
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setForm({
        name: user.name,
        email: user.email,
        username: user.username || '',
        password: '',
        role: user.role,
        warehouse_id: user.warehouse_id || '',
        phone: user.phone || '',
        permissions: user.permissions || {},
      });
    } else {
      setEditingUser(null);
      const defaultPerms: UserPermissions = {};
      ALL_PERMISSION_KEYS.forEach((k) => { defaultPerms[k] = true; });
      setForm({ name: '', email: '', username: '', password: '', role: 'EMPLOYEE', warehouse_id: '', phone: '', permissions: defaultPerms });
    }
    setShowModal(true);
  };

  const handleOpenPasswordModal = (user: User) => {
    setPasswordTargetUser(user);
    setPasswordForm({ current: '', newPass: '', confirm: '' });
    setShowCurrent(false);
    setShowNew(false);
    setShowPasswordModal(true);
  };

  const togglePermission = (key: PermissionKey) => {
    setForm((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }));
  };

  const toggleAllPermissions = (checked: boolean) => {
    const perms: UserPermissions = {};
    ALL_PERMISSION_KEYS.forEach((k) => { perms[k] = checked; });
    setForm((prev) => ({ ...prev, permissions: perms }));
  };

  const allChecked = ALL_PERMISSION_KEYS.every((k) => form.permissions[k]);

  const handleSaveUser = async () => {
    if (!form.name || !form.username) {
      toast.error('الرجاء إدخال الاسم واسم المستخدم');
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        const { data: result, error } = await supabase.rpc('update_user_with_permissions', {
          p_user_id: editingUser.id,
          p_name: form.name,
          p_username: form.username,
          p_role: form.role,
          p_warehouse_id: form.warehouse_id || null,
          p_phone: form.phone || null,
          p_permissions: form.role === 'ADMIN' ? {} : form.permissions,
        });

        if (error) throw error;
        if (!result?.success) {
          toast.error(result?.message || 'حدث خطأ');
          return;
        }
        toast.success('تم تحديث المستخدم بنجاح');
      } else {
        if (!form.password) {
          toast.error('الرجاء إدخال كلمة المرور');
          return;
        }
        if (form.password.length < 4) {
          toast.error('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
          return;
        }

        const { data: result, error } = await supabase.rpc('create_user_with_password', {
          p_name: form.name,
          p_email: form.email || `${form.username}@magic.local`,
          p_username: form.username,
          p_password: form.password,
          p_role: form.role,
          p_warehouse_id: form.warehouse_id || null,
          p_phone: form.phone || null,
          p_permissions: form.role === 'ADMIN' ? {} : form.permissions,
        });

        if (error) throw error;
        if (!result?.success) {
          toast.error(result?.message || 'حدث خطأ');
          return;
        }
        toast.success('تم إضافة المستخدم بنجاح');
      }

      setShowModal(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordTargetUser) return;

    if (!passwordForm.current || !passwordForm.newPass || !passwordForm.confirm) {
      toast.error('الرجاء ملء جميع الحقول');
      return;
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast.error('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    if (passwordForm.newPass.length < 4) {
      toast.error('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      return;
    }

    setSavingPassword(true);
    try {
      const { data: result, error } = await supabase.rpc('change_user_password', {
        p_user_id: passwordTargetUser.id,
        p_current_password: passwordForm.current,
        p_new_password: passwordForm.newPass,
      });

      if (error) throw error;
      if (!result?.success) {
        toast.error(result?.message || 'حدث خطأ');
        return;
      }

      toast.success('تم تغيير كلمة المرور بنجاح');
      setShowPasswordModal(false);
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('لا يمكنك تعطيل حسابك الحالي');
      return;
    }
    try {
      await supabase.from('users').update({ is_active: !user.is_active }).eq('id', user.id);
      fetchUsers();
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const grouped = getGrouped();

  const getPermissionSummary = (user: User) => {
    if (user.role === 'ADMIN') return 'كامل الصلاحيات';
    if (!user.permissions || Object.keys(user.permissions).length === 0) return 'كامل الصلاحيات';
    const enabled = ALL_PERMISSION_KEYS.filter((k) => user.permissions?.[k]);
    if (enabled.length === ALL_PERMISSION_KEYS.length) return 'كامل الصلاحيات';
    if (enabled.length === 0) return 'بدون صلاحيات';
    return `${enabled.length} من ${ALL_PERMISSION_KEYS.length}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إدارة المستخدمين</h1>
          <p className="text-gray-500 mt-1">إضافة وتعديل وصلاحيات المستخدمين</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg transition-colors"
        >
          <Plus size={20} />
          إضافة مستخدم
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو اسم المستخدم..."
              className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-gray-300"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-gray-300"
          >
            <option value="">كل الأدوار</option>
            <option value="ADMIN">مدير النظام</option>
            <option value="EMPLOYEE">موظف</option>
            <option value="CRAFTSMAN">صنايعي</option>
            <option value="PROJECT_MANAGER">مدير مشاريع</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><div className="spinner mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">المستخدم</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">اسم الدخول</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">الدور</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">الصلاحيات</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">المخزن</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">الحالة</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((u) => {
                  const roleConfig = getRoleConfig(u.role);
                  const RoleIcon = roleConfig.icon;
                  const permSummary = getPermissionSummary(u);

                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="font-semibold text-gray-600">{u.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-semibold">{u.name}</p>
                            <p className="text-sm text-gray-500">{u.phone || u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-700">{u.username || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={clsx('inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm', roleConfig.color)}>
                          <RoleIcon size={14} />
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          'text-sm font-medium',
                          permSummary === 'كامل الصلاحيات' ? 'text-green-600' :
                          permSummary === 'بدون صلاحيات' ? 'text-red-500' : 'text-amber-600'
                        )}>
                          {permSummary}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{u.warehouse?.name || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={clsx('px-3 py-1 rounded-full text-sm', u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                          {u.is_active ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleOpenModal(u)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600" title="تعديل">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleOpenPasswordModal(u)} className="p-2 hover:bg-blue-50 rounded-lg text-blue-600" title="تغيير كلمة المرور">
                            <Key size={16} />
                          </button>
                          {u.id !== currentUser?.id && (
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium', u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100')}
                            >
                              {u.is_active ? 'تعطيل' : 'تفعيل'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-6 pb-4 border-b border-gray-200 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الاسم <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم المستخدم (للدخول) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 font-mono"
                    placeholder="مثال: ahmed123"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Password for new users */}
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    كلمة المرور <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showFormPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full px-4 py-2.5 pl-11 rounded-lg border border-gray-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
                      placeholder="4 أحرف على الأقل"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword(!showFormPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showFormPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الدور</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                  >
                    <option value="ADMIN">مدير النظام</option>
                    <option value="EMPLOYEE">موظف</option>
                    <option value="CRAFTSMAN">صنايعي</option>
                    <option value="PROJECT_MANAGER">مدير مشاريع</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">المخزن</label>
                  <select
                    value={form.warehouse_id}
                    onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                  >
                    <option value="">بدون مخزن</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">رقم الهاتف</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300"
                />
              </div>

              {/* Permissions Section */}
              {form.role !== 'ADMIN' && (
                <div className="border-t border-gray-200 pt-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-gray-800 flex items-center gap-2">
                        <Shield size={18} className="text-gold-500" />
                        الصلاحيات
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">حدد الأقسام المتاحة لهذا المستخدم</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleAllPermissions(!allChecked)}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                        allChecked ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <Check size={14} />
                      {allChecked ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(grouped).map(([group, items]) => (
                      <div key={group} className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-semibold text-gray-700 text-sm mb-3">{group}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {items.map((item) => (
                            <div
                              key={item.key}
                              onClick={() => togglePermission(item.key)}
                              className={clsx(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all select-none',
                                form.permissions[item.key]
                                  ? 'bg-green-50 border border-green-200'
                                  : 'bg-white border border-gray-200 hover:border-gray-300'
                              )}
                            >
                              <div className={clsx(
                                'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors',
                                form.permissions[item.key]
                                  ? 'bg-green-500'
                                  : 'border-2 border-gray-300'
                              )}>
                                {form.permissions[item.key] && <Check size={14} className="text-white" />}
                              </div>
                              <span className={clsx(
                                'text-sm',
                                form.permissions[item.key] ? 'text-gray-800 font-medium' : 'text-gray-600'
                              )}>
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {form.role === 'ADMIN' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-700 flex items-center gap-2">
                    <Shield size={16} />
                    مدير النظام يملك كامل الصلاحيات تلقائيا
                  </p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white p-6 pt-4 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveUser}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-lg disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && passwordTargetUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">تغيير كلمة المرور</h3>
                <p className="text-sm text-gray-500 mt-0.5">{passwordTargetUser.name}</p>
              </div>
              <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور الحالية</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    className="w-full px-4 py-2.5 pl-11 rounded-lg border border-gray-300"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور الجديدة</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={passwordForm.newPass}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                    className="w-full px-4 py-2.5 pl-11 rounded-lg border border-gray-300"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">تأكيد كلمة المرور الجديدة</label>
                <input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  className={clsx('w-full px-4 py-2.5 rounded-lg border', passwordForm.confirm && passwordForm.newPass !== passwordForm.confirm ? 'border-red-400' : 'border-gray-300')}
                  autoComplete="new-password"
                />
                {passwordForm.confirm && passwordForm.newPass !== passwordForm.confirm && (
                  <p className="text-xs text-red-500 mt-1">كلمة المرور غير متطابقة</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPasswordModal(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">
                إلغاء
              </button>
              <button
                onClick={handleChangePassword}
                disabled={savingPassword}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50"
              >
                {savingPassword ? 'جاري الحفظ...' : 'تغيير كلمة المرور'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
