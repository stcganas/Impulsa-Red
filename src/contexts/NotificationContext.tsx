import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from './UserContext';
import { toast } from 'sonner';
import OneSignal from 'react-onesignal';

interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
}

interface SocialActivity {
  id: string;
  user: string;
  avatar?: string;
  action: string;
  time: string;
}

interface NotificationContextType {
  // System Notifications
  notifications: SystemNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  
  // Social/Live Activities
  liveActivities: SocialActivity[];
  
  // Permission (Legacy/Compatibility)
  permission: NotificationPermission;
  requestPermission: () => Promise<void>;
  token: string | null;
  tokenError: string | null;
  
  // Legacy compatibility for LiveActivityNotifications component
  config: {
    enabled: boolean;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  };
  liveNotifications: SocialActivity[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [liveActivities] = useState<SocialActivity[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isOneSignalInitialized, setIsOneSignalInitialized] = useState(false);

  // Initialize OneSignal
  useEffect(() => {
    const oneSignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    if (!oneSignalAppId) return;

    // Direct check if already initialized to avoid "SDK already initialized" error
    if (window.OneSignal && (window as any).OneSignal.initialized) {
      setIsOneSignalInitialized(true);
      setPermission(Notification.permission);
      return;
    }

    OneSignal.init({
      appId: oneSignalAppId,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: 'OneSignalSDKWorker.js',
    }).then(() => {
      console.log('OneSignal Initialized');
      setIsOneSignalInitialized(true);
      setPermission(Notification.permission);
    }).catch(err => {
      // Gracefully handle domain or browser constraints
      if (err.message && err.message.includes('Can only be used on')) {
        console.warn('OneSignal Domain Mismatch: This is expected on development URLs unless manually configured in OneSignal dashboard.');
      } else if (err.message && err.message.includes('already initialized')) {
        setIsOneSignalInitialized(true);
      } else {
        console.error('OneSignal Init Error:', err);
      }
    });
  }, []);

  // Sync OneSignal with User ID
  useEffect(() => {
    if (!isOneSignalInitialized) return;

    const syncUser = async () => {
      try {
        // Double check if script is loaded and SDK is initialized
        if (typeof window === 'undefined' || !window.OneSignal) return;
        
        const os = window.OneSignal as any;
        
        if (user?.id) {
          // Check if login method exists and SDK is initialized
          if (os.login && typeof os.login === 'function') {
            await OneSignal.login(user.id);
            console.log('OneSignal User Synced (Login):', user.id);
          } else if ((os as any).setExternalUserId) {
            await (OneSignal as any).setExternalUserId(user.id);
            console.log('OneSignal User Synced (ExternalID):', user.id);
          }
        } else {
          if (os.logout && typeof os.logout === 'function') {
            await OneSignal.logout();
          }
        }
      } catch (err) {
        // Silence minified property errors that are common in dev during reloads
        console.warn('OneSignal Sync Warning:', err);
      }
    };

    syncUser();
  }, [user?.id, isOneSignalInitialized]);

  const [config] = useState({
    enabled: true,
    position: 'top-right' as const
  });

  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notification history:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchHistory();

      // Subscribe to Realtime personal notifications
      const systemSub = supabase
        .channel('personal_notifs')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          const newNotif = payload.new as SystemNotification;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          toast(newNotif.title, {
            description: newNotif.message,
            duration: 5000,
            action: {
              label: 'Ver',
              onClick: () => window.location.href = '/notifications'
            }
          });
        })
        .subscribe();

      return () => {
        supabase.removeChannel(systemSub);
      };
    }
  }, [user?.id, fetchHistory]);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const requestPermission = async () => {
    try {
      await OneSignal.Slidedown.promptPush();
      setPermission(Notification.permission);
    } catch (err) {
      console.error('Error requesting permission:', err);
    }
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      loading, 
      markAsRead, 
      markAllAsRead,
      liveActivities,
      permission,
      requestPermission,
      token,
      tokenError,
      config,
      liveNotifications: liveActivities
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
