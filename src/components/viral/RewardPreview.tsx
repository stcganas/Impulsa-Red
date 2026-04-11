import React from 'react';
import { motion } from 'motion/react';
import { Gift, Star, TrendingUp, Award } from 'lucide-react';

export default function RewardPreview() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100 rounded-2xl p-6 shadow-sm mb-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md">
          <Gift className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">
          Al registrarte recibirás:
        </h3>
      </div>
      
      <ul className="space-y-3">
        <li className="flex items-center gap-3 text-slate-700 font-medium">
          <div className="bg-amber-100 text-amber-600 p-1.5 rounded-full">
            <Star className="w-4 h-4" />
          </div>
          <span>+100 XP de bonificación inicial</span>
        </li>
        <li className="flex items-center gap-3 text-slate-700 font-medium">
          <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-full">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span>Acceso inmediato a ganancias por red</span>
        </li>
        <li className="flex items-center gap-3 text-slate-700 font-medium">
          <div className="bg-purple-100 text-purple-600 p-1.5 rounded-full">
            <Award className="w-4 h-4" />
          </div>
          <span>Oportunidad de convertirte en líder</span>
        </li>
      </ul>
    </motion.div>
  );
}
