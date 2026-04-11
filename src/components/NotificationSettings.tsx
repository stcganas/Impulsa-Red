import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { Bell, Clock, Layout, Eye, Power } from 'lucide-react';

const NotificationSettings: React.FC = () => {
  const { config, updateConfig } = useNotifications();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600">
            <Bell size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Notificaciones de Actividad</h3>
            <p className="text-sm text-slate-500">Simula tráfico y actividad en tiempo real</p>
          </div>
        </div>
        
        <button
          onClick={() => updateConfig({ enabled: !config.enabled })}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
            config.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              config.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="space-y-6">
        {/* Interval Setting */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Clock size={16} />
            <span>Intervalo de Aparición (segundos)</span>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="5"
              max="60"
              step="1"
              value={config.interval}
              onChange={(e) => updateConfig({ interval: parseInt(e.target.value) })}
              className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="w-12 text-center font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 py-1 rounded-lg">
              {config.interval}s
            </span>
          </div>
        </div>

        {/* Max Visible Setting */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Eye size={16} />
            <span>Máximo de Notificaciones Simultáneas</span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                onClick={() => updateConfig({ maxVisible: num })}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                  config.maxVisible === num
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Position Setting */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Layout size={16} />
            <span>Posición en Pantalla</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => updateConfig({ position: pos })}
                className={`py-3 rounded-xl text-xs font-bold capitalize transition-all ${
                  config.position === pos
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {pos.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
        <div className="flex gap-3">
          <div className="text-blue-600">
            <Power size={20} />
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            Esta configuración se guarda localmente en tu navegador. Los usuarios verán las notificaciones según la actividad real o simulada configurada aquí.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
