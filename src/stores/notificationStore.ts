import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Notification } from '../types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;

  fetchNotifications: (userId: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set, _get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async (userId: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const notifications = data || [];
      const unreadCount = notifications.filter((n) => !n.is_read).length;

      set({ notifications, unreadCount, isLoading: false });
    } catch (err) {
      console.error('Fetch notifications error:', err);
      set({ isLoading: false });
    }
  },

  addNotification: (notification) => {
    set((state) => {
      const notifications = [notification, ...state.notifications];
      const unreadCount = notifications.filter((n) => !n.is_read).length;
      return { notifications, unreadCount };
    });
  },

  markAsRead: async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      set((state) => {
        const notifications = state.notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        );
        const unreadCount = notifications.filter((n) => !n.is_read).length;
        return { notifications, unreadCount };
      });
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  },

  markAllAsRead: async (userId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', userId)
        .eq('is_read', false);

      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error('Mark all as read error:', err);
    }
  },

  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
}));

// Notification types
export const NOTIFICATION_TYPES = {
  STOCK_TRANSFER: 'STOCK_TRANSFER',
  CREDIT_OVERDUE: 'CREDIT_OVERDUE',
  INSPECTION_REQUEST: 'INSPECTION_REQUEST',
  INSPECTION_ASSIGNED: 'INSPECTION_ASSIGNED',
  MATERIALS_REQUEST: 'MATERIALS_REQUEST',
  MATERIALS_DELIVERED: 'MATERIALS_DELIVERED',
  LOW_STOCK: 'LOW_STOCK',
  NEW_CRAFTSMAN: 'NEW_CRAFTSMAN',
} as const;

export const createNotification = async (
  recipientId: string,
  type: string,
  title: string,
  message: string,
  referenceId?: string,
  referenceType?: string
) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      recipient_id: recipientId,
      type,
      title,
      message,
      reference_id: referenceId || null,
      reference_type: referenceType || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Create notification error:', error);
    return null;
  }

  return data;
};
