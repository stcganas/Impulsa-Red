import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { motion, AnimatePresence } from 'motion/react';
import { User, Activity } from 'lucide-react';

const LiveActivityNotifications: React.FC = () => {
  const { notifications, config } = useNotifications();

  if (!config.enabled) return null;

  const positionClasses = {
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6'
  };

  return (
    <div className={`fixed z-[9999] pointer-events-none flex flex-col gap-3 ${positionClasses[config.position]}`}>
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: config.position.includes('right') ? 50 : -50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            className="pointer-events-auto w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-3"
          >
            <div className="relative flex-shrink-0">
              {notification.avatar ? (
                <img 
                  src={notification.avatar} 
                  alt={notification.user} 
                  className="w-10 h-10 rounded-full object-cover border-2 border-blue-500/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                  <User size={20} />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {notification.user}
                </span>
                <Activity size={12} className="text-blue-500" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
                {notification.action}
              </p>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                {notification.time}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default LiveActivityNotifications;
