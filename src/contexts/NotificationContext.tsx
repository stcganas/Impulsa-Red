import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface NotificationConfig {
  enabled: boolean;
  interval: number; // in seconds
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible: number;
}

interface ActivityNotification {
  id: string;
  user: string;
  action: string;
  time: string;
  avatar?: string;
}

interface NotificationContextType {
  config: NotificationConfig;
  updateConfig: (newConfig: Partial<NotificationConfig>) => void;
  notifications: ActivityNotification[];
  addNotification: (notification: Omit<ActivityNotification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

const DEFAULT_CONFIG: NotificationConfig = {
  enabled: true,
  interval: 12,
  position: 'bottom-right',
  maxVisible: 3
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const ACTIONS = [
  "acaba de retirar $50",
  "completó una tarea de nivel 2",
  "invitó a un nuevo miembro",
  "subió al nivel 5",
  "acaba de depositar $100",
  "completó su entrenamiento diario",
  "recibió una comisión por referido",
  "desbloqueó un nuevo logro",
  "acaba de unirse al equipo",
  "calificó para el bono semanal"
];

const NAMES = [
  "Carlos R.", "Maria G.", "Juan P.", "Elena M.", "Luis F.", 
  "Sofia T.", "Andrés B.", "Lucia S.", "Roberto V.", "Gabriela D.",
  "Miguel A.", "Patricia L.", "Fernando K.", "Isabel J.", "Diego M."
];

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<NotificationConfig>(() => {
    const saved = localStorage.getItem('notification_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);

  const updateConfig = (newConfig: Partial<NotificationConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig };
      localStorage.setItem('notification_config', JSON.stringify(updated));
      return updated;
    });
  };

  const addNotification = useCallback((notification: Omit<ActivityNotification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => {
      const updated = [...prev, { ...notification, id }];
      if (updated.length > config.maxVisible) {
        return updated.slice(updated.length - config.maxVisible);
      }
      return updated;
    });

    // Auto remove after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  }, [config.maxVisible]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Simulate activity
  useEffect(() => {
    if (!config.enabled) return;

    const intervalId = setInterval(() => {
      const randomName = NAMES[Math.floor(Math.random() * NAMES.length)];
      const randomAction = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
      
      addNotification({
        user: randomName,
        action: randomAction,
        time: "Hace un momento",
        avatar: `https://i.pravatar.cc/150?u=${randomName}`
      });
    }, config.interval * 1000);

    return () => clearInterval(intervalId);
  }, [config.enabled, config.interval, addNotification]);

  return (
    <NotificationContext.Provider value={{ config, updateConfig, notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
