import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Package,
  AlertTriangle,
  CreditCard,
  ClipboardList,
  Truck,
  Users,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import type { Notification } from '../types';
import clsx from 'clsx';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'STOCK_TRANSFER': return Truck;
    case 'CREDIT_OVERDUE': return CreditCard;
    case 'INSPECTION_REQUEST': return ClipboardList;
    case 'INSPECTION_ASSIGNED': return ClipboardList;
    case 'MATERIALS_REQUEST': return Package;
    case 'MATERIALS_DELIVERED': return Package;
    case 'LOW_STOCK': return AlertTriangle;
    case 'NEW_CRAFTSMAN': return Users;
    default: return Bell;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'CREDIT_OVERDUE': case 'LOW_STOCK': return 'bg-red-100 text-red-600';
    case 'STOCK_TRANSFER': case 'MATERIALS_DELIVERED': return 'bg-blue-100 text-blue-600';
    case 'INSPECTION_REQUEST': case 'INSPECTION_ASSIGNED': return 'bg-amber-100 text-amber-600';
    case 'NEW_CRAFTSMAN': return 'bg-green-100 text-green-600';
    default: return 'bg-gray-100 text-gray-600';
  }
};

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { markAsRead, markAllAsRead, fetchNotifications } = useNotificationStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user?.id]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead(user!.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    fetchNotifications(user!.id);
  };

  const handleClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkRead(notification.id);
    }
    if (notification.reference_type && notification.reference_id) {
      switch (notification.reference_type) {
        case 'invoice': navigate(`/sales/invoices/${notification.reference_id}`); break;
        case 'project': navigate(`/projects/${notification.reference_id}`); break;
        case 'inspection': navigate('/projects/inspections'); break;
        case 'product': navigate(`/inventory/${notification.reference_id}`); break;
        default: break;
      }
    }
  };

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الإشعارات</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0 ? `لديك ${unreadCount} إشعار غير مقروء` : 'لا توجد إشعارات جديدة'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 text-sm text-gold-600 hover:text-gold-700 font-medium"
          >
            <CheckCheck size={18} />
            تحديد الكل كمقروء
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={clsx(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            filter === 'all' ? 'bg-gold-500 text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          الكل ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={clsx(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            filter === 'unread' ? 'bg-gold-500 text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          غير مقروء ({unreadCount})
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <div className="spinner mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <Bell size={48} className="mx-auto text-gray-300" />
          <p className="text-gray-500 mt-4">لا توجد إشعارات</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-card overflow-hidden divide-y divide-gray-100">
          {filtered.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const colorClass = getNotificationColor(notification.type);

            return (
              <button
                key={notification.id}
                onClick={() => handleClick(notification)}
                className={clsx(
                  'w-full p-4 text-right flex items-start gap-4 hover:bg-gray-50 transition-colors',
                  !notification.is_read && 'bg-gold-50/50'
                )}
              >
                <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', colorClass)}>
                  <Icon size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={clsx('font-semibold text-gray-800', !notification.is_read && 'text-gray-900')}>
                      {notification.title}
                    </p>
                    {!notification.is_read && (
                      <span className="w-2 h-2 bg-gold-500 rounded-full flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(notification.created_at).toLocaleDateString('ar', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {!notification.is_read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkRead(notification.id);
                    }}
                    className="p-2 rounded-lg hover:bg-gray-200 text-gray-400 flex-shrink-0"
                    title="تحديد كمقروء"
                  >
                    <Check size={16} />
                  </button>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
