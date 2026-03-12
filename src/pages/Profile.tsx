import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  User,
  Settings,
  BookOpen,
  Crown,
  ChevronRight,
  LogOut,
  ShieldCheck,
  Wallet,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useUser();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 relative overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white pt-12 pb-32 px-6 rounded-b-[40px] shadow-xl relative">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-blue-600/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
          <button className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
            <Settings className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="px-6 -mt-24 relative z-20 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 text-center"
        >
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full bg-blue-100 border-4 border-white shadow-lg flex items-center justify-center text-blue-600 text-3xl font-black">
              {user.name.charAt(0)}
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {user.name}
          </h2>
          <p className="text-slate-500 font-medium mb-6">{user.email}</p>

          <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-2xl p-4 mb-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Plan
              </p>
              <p className="font-black text-slate-900">{user.plan}</p>
            </div>
            <div className="border-x border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Nivel
              </p>
              <p className="font-black text-slate-900">{user.level}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Comisión
              </p>
              <p className="font-black text-emerald-600">
                {user.percentage}%
              </p>
            </div>
          </div>

          {user.plan !== 'Élite' && (
            <button 
              onClick={() => navigate("/plan-selection")}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-lg shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Crown className="w-5 h-5" />
              <span>Mejorar Plan</span>
            </button>
          )}
        </motion.div>
      </div>

      {/* Stats & Links */}
      <div className="px-6 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex justify-between items-center"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Total Generado
            </p>
            <p className="font-black text-2xl text-slate-900">
              ${(user.totalEarned || 0).toLocaleString("es-CO")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Código
            </p>
            <p className="font-bold text-slate-700">{user.referral_code}</p>
          </div>
        </motion.div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <button 
            onClick={() => navigate("/wallet")}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800">
                Mi Billetera
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={() => navigate("/training")}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800">
                Centro de Capacitación
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={() => navigate("/mentor")}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800">
                Mentor IA (Gemini)
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <Settings className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800">Configuración</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={handleLogout}
            className="w-full p-5 flex items-center justify-between hover:bg-red-50 transition-colors text-red-600"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="font-bold">Cerrar Sesión</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
