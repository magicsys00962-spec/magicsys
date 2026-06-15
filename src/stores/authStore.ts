import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { User, Warehouse, PermissionKey } from '../types';

interface AuthState {
  user: User | null;
  warehouse: Warehouse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      warehouse: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const { data: result, error: rpcError } = await supabase
            .rpc('login_user_by_username', { p_username: username, p_password: password });

          if (rpcError || !result) {
            set({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة', isLoading: false });
            return false;
          }

          if (!result.success) {
            set({ error: result.message || 'اسم المستخدم أو كلمة المرور غير صحيحة', isLoading: false });
            return false;
          }

          const userData = result.user;
          const warehouseData = result.warehouse?.id ? result.warehouse : null;

          if (!userData) {
            set({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة', isLoading: false });
            return false;
          }

          set({
            user: userData,
            warehouse: warehouseData,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (err) {
          console.error('Login error:', err);
          set({ error: 'حدث خطأ أثناء تسجيل الدخول', isLoading: false });
          return false;
        }
      },

      logout: async () => {
        try {
          await supabase.auth.signOut();
        } catch (err) {
          console.error('Logout error:', err);
        }
        set({
          user: null,
          warehouse: null,
          isAuthenticated: false,
          error: null,
        });
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const storedUser = localStorage.getItem('auth-storage');
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (parsed.state?.user) {
              const { data: result } = await supabase
                .rpc('get_user_by_id', { p_user_id: parsed.state.user.id });

              if (result && result.user) {
                set({
                  user: result.user,
                  warehouse: result.warehouse?.id ? result.warehouse : null,
                  isAuthenticated: true,
                  isLoading: false,
                });
                return;
              }
            }
          }
        } catch (err) {
          console.error('Auth check error:', err);
        }
        set({ isLoading: false });
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        warehouse: state.warehouse,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Role check helpers
export const isAdmin = (user: User | null) => user?.role === 'ADMIN';
export const isEmployee = (user: User | null) => user?.role === 'EMPLOYEE';
export const isCraftsman = (user: User | null) => user?.role === 'CRAFTSMAN';
export const isProjectManager = (user: User | null) => user?.role === 'PROJECT_MANAGER';

// Permission helpers
export const canManageProducts = (user: User | null) =>
  user?.role === 'ADMIN' || user?.role === 'EMPLOYEE';

export const canCreateInvoices = (user: User | null) =>
  user?.role === 'ADMIN' || user?.role === 'EMPLOYEE';

export const canManageUsers = (user: User | null) =>
  user?.role === 'ADMIN';

export const canManageWarehouses = (user: User | null) =>
  user?.role === 'ADMIN';

export const canManagePricing = (user: User | null) =>
  user?.role === 'ADMIN';

export const canAccessProjects = (user: User | null) =>
  user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

export const canViewAllWarehouses = (user: User | null) =>
  user?.role === 'ADMIN';

export const hasPermission = (user: User | null, key: PermissionKey): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (!user.permissions || Object.keys(user.permissions).length === 0) return true;
  return user.permissions[key] === true;
};
