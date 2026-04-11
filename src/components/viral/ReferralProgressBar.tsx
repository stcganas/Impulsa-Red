import React from 'react';
import { motion } from 'motion/react';
import { Target, PartyPopper } from 'lucide-react';

export default function ReferralProgressBar({ current, goal }: { current: number, goal: number }) {
  const progress = Math.min((current / goal) * 100, 100);
  const isComplete = current >= goal;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <Target className="w-5 h-5 text-blue-500" />
          <span>Meta del equipo</span>
        </div>
        <span className="text-sm font-bold text-slate-500">
          {current} / {goal}
        </span>
      </div>

      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden relative">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`absolute top-0 left-0 h-full rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-blue-500'}`}
        />
      </div>

      {isComplete ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-xl text-sm font-bold"
        >
          <PartyPopper className="w-5 h-5" />
          <span>¡Meta alcanzada! Nuevas recompensas desbloqueadas</span>
        </motion.div>
      ) : (
        <p className="mt-3 text-xs text-slate-500 text-center font-medium">
          Faltan {goal - current} miembros para la siguiente meta
        </p>
      )}
    </div>
  );
}
