import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy,
  Users,
  CheckSquare,
  Bell,
  ChevronRight,
  TrendingUp,
  Sparkles,
  LogOut,
} from "lucide-react";
import { motion } from "motion/react";
import { useUser } from "../contexts/UserContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading, logout } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return null;

  // Calculate badge based on level
  const getBadge = (level: number) => {
    if (level >= 100) return "Arquitecto";
    if (level >= 90) return "Líder Supremo";
    if (level >= 80) return "Transformador";
    if (level >= 70) return "Referente";
    if (level >= 60) return "Mentor";
    if (level >= 50) return "Inspirador";
    if (level >= 40) return "Constructor";
    if (level >= 30) return "Estratega";
    if (level >= 20) return "Visionario";
    if (level >= 10) return "Emprendedor";
    return "Novato";
  };

  const badge = getBadge(user.level);
  
  // Calculate XP needed for next level (simple formula: level * 100)
  const xpNeeded = user.level * 100;
  
  const currentCommission = user.percentage;
  const progressTo70 = (currentCommission / 70) * 100;
  const levelProgress = (user.xp / xpNeeded) * 100;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-slate-900 text-white pt-20 pb-24 px-6 rounded-b-[40px] shadow-xl relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-blue-600/20 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/20 blur-[60px] rounded-full pointer-events-none" />

        <div className="absolute top-6 right-6 z-50 flex gap-3">
          <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center relative hover:bg-white/20 transition-colors">
            <Bell className="w-5 h-5 text-white" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900" />
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 text-red-100 border border-red-500/30 text-sm font-medium hover:bg-red-500 hover:text-white transition-all shadow-lg"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
            <span className="sm:hidden">Salir</span>
          </button>
        </div>

        <div className="relative z-10 flex justify-between items-center mb-8">
          <div>
            <p className="text-slate-400 font-medium mb-1">Hola,</p>
            <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-400 font-bold uppercase tracking-wider text-sm">
                {badge}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-xs font-medium text-slate-300">
                Plan {user.plan}
              </span>
            </div>
            <div className="text-2xl font-black">Nivel {user.level}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 -mt-16 space-y-6 relative z-20">
        {/* Commission Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-slate-500 font-medium text-sm mb-1 uppercase tracking-wider">
                Comisión Actual
              </p>
              <div className="text-4xl font-black text-slate-900 flex items-baseline gap-1">
                {currentCommission.toFixed(1)}
                <span className="text-2xl text-slate-400">%</span>
              </div>
            </div>

            {/* Circular Progress */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 36 36"
              >
                <path
                  className="text-slate-100"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-blue-500"
                  strokeDasharray={`${progressTo70}, 100`}
                  strokeWidth="3"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Meta
                </span>
                <span className="text-sm font-black text-slate-900">70%</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4">
            <div className="flex justify-between text-sm font-medium mb-2">
              <span className="text-slate-600">
                Progreso a Nivel {user.level + 1}
              </span>
              <span className="text-blue-600 font-bold">
                {user.xp} / {xpNeeded} XP
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full relative"
              >
                <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/30 blur-[2px]" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Earnings Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate("/wallet")}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 shadow-xl shadow-emerald-500/20 text-white relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex justify-between items-center mb-2 relative z-10">
            <p className="font-medium text-emerald-100 uppercase tracking-wider text-sm">
              Total Generado
            </p>
            <TrendingUp className="w-5 h-5 text-emerald-200" />
          </div>
          <div className="text-4xl font-black tracking-tight relative z-10">
            ${(user.totalEarned || 0).toLocaleString("es-CO")}
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-100 uppercase tracking-widest">
            <span>Ver Billetera</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate("/referrals")}
            className="bg-white rounded-3xl p-5 shadow-lg shadow-slate-200/40 border border-slate-100 flex flex-col items-center justify-center gap-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-7 h-7" />
            </div>
            <span className="font-bold text-slate-800">Invitar</span>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => navigate("/tasks")}
            className="bg-white rounded-3xl p-5 shadow-lg shadow-slate-200/40 border border-slate-100 flex flex-col items-center justify-center gap-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
              <CheckSquare className="w-7 h-7" />
            </div>
            <span className="font-bold text-slate-800">Ver Tareas</span>
          </motion.button>
        </div>

        {/* Next Milestone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => navigate("/mentor")}
          className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/20 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/20 blur-2xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-0.5">
                Nuevo
              </p>
              <p className="font-bold text-lg">Hablar con Mentor IA</p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-slate-500" />
        </motion.div>

        {/* Next Milestone (Old one moved down or modified) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium mb-0.5">
                Próxima Insignia
              </p>
              <p className="font-bold text-slate-800">Constructor (Nivel 40)</p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-300">Bloqueado</span>
        </div>
      </div>
    </div>
  );
}
