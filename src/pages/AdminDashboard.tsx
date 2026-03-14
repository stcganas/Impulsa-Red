import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  TrendingUp,
  DollarSign,
  Settings,
  Bell,
  Search,
  ShieldCheck,
  BarChart3,
  Activity,
  LogOut,
  CheckCircle,
  XCircle,
  Loader2,
  CheckSquare,
  Video
} from "lucide-react";
import { motion } from "motion/react";
import { useUser } from "../contexts/UserContext";
import { useSettings } from "../contexts/SettingsContext";
import { supabase } from "../lib/supabase";
import UserManagement from "../components/UserManagement";
import TaskManagement from "../components/TaskManagement";
import TransactionManagement from "../components/TransactionManagement";
import CourseManagement from "../components/CourseManagement";
import SettingsManagement from "../components/SettingsManagement";

interface AdminStats {
  totalUsers: number;
  totalTransactions: number;
  totalVolume: number;
  activeUsers: number;
}

import NotificationCenter from "../components/NotificationCenter";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading, logout } = useUser();
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalTransactions: 0,
    totalVolume: 0,
    activeUsers: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch total users
        const { count: totalUsersCount, error: usersError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });

        if (usersError) throw usersError;

        // Fetch active users (status = 'active')
        const { count: activeUsersCount, error: activeUsersError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        if (activeUsersError) throw activeUsersError;

        // Fetch total transactions and volume
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('amount');

        if (transactionsError) throw transactionsError;

        const totalTransactions = transactionsData.length;
        const totalVolume = transactionsData.reduce((sum, tx) => sum + Number(tx.amount), 0);

        setStats({
          totalUsers: totalUsersCount || 0,
          totalTransactions: totalTransactions,
          totalVolume: totalVolume,
          activeUsers: activeUsersCount || 0
        });

        // Fetch recent transactions
        const { data: recentTxs, error: recentTxsError } = await supabase
          .from('transactions')
          .select(`
            id,
            type,
            amount,
            created_at,
            users!transactions_user_id_fkey (
              name
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        if (recentTxsError) throw recentTxsError;

        const formattedActivity = (recentTxs || []).map(tx => {
          let action = "";
          if (tx.type === 'withdrawal') action = "Retiro Solicitado";
          else if (tx.type === 'deposit') action = "Depósito";
          else if (tx.type === 'referral_bonus') action = "Bono de Referido";
          else if (tx.type === 'task_reward') action = "Recompensa de Tarea";
          else if (tx.type === 'plan_purchase') action = "Compra de Plan";
          else if (tx.type === 'referral_commission') action = "Comisión de Referido";
          else action = tx.type;

          const date = new Date(tx.created_at);
          const now = new Date();
          const diffMs = now.getTime() - date.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMins / 60);
          const diffDays = Math.floor(diffHours / 24);

          let timeStr = "";
          if (diffMins < 60) timeStr = `Hace ${diffMins} min`;
          else if (diffHours < 24) timeStr = `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
          else timeStr = `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;

          return {
            id: tx.id,
            user: (tx.users as any)?.name || "Usuario Desconocido",
            action: action,
            time: timeStr,
            amount: `$${Number(tx.amount).toLocaleString()}`
          };
        });

        setRecentActivity(formattedActivity);

      } catch (error) {
        console.error("Error fetching admin stats:", error);
      }
    };

    if (user && user.role === 'admin') {
      fetchStats();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-emerald-500/30 pb-20 lg:pb-0">
      {/* Sidebar Navigation (Desktop) */}
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-[#111] border-r border-white/5 flex-col p-6 z-50 overflow-y-auto">
        <div className="flex items-center gap-3 mb-12 px-2">
          {settings.app_logo ? (
            <img src={settings.app_logo} alt="Admin Logo" className="h-10 object-contain" />
          ) : (
            <>
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                <ShieldCheck className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-bold tracking-tight">Impulsa<span className="text-emerald-500">Admin</span></span>
            </>
          )}
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { icon: BarChart3, label: "Dashboard" },
            { icon: Users, label: "Usuarios" },
            { icon: TrendingUp, label: "Transacciones" },
            { icon: CheckSquare, label: "Tareas" },
            { icon: Video, label: "Cursos" },
            { icon: Settings, label: "Configuración" },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(item.label)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.label 
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Bottom Navigation (Mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#111] border-t border-white/5 flex justify-around items-center p-2 z-50 overflow-x-auto">
        {[
          { icon: BarChart3, label: "Dashboard" },
          { icon: Users, label: "Usuarios" },
          { icon: TrendingUp, label: "Transacciones" },
          { icon: CheckSquare, label: "Tareas" },
          { icon: Video, label: "Cursos" },
          { icon: Settings, label: "Configuración" },
        ].map((item, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(item.label)}
            className={`flex flex-col items-center gap-1 p-2 min-w-[70px] rounded-xl transition-all ${
              activeTab === item.label 
                ? "text-emerald-500" 
                : "text-slate-500"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[9px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <div className="lg:pl-64 min-h-screen">
        {/* Top Header */}
        <header className="h-16 lg:h-20 border-b border-white/5 flex items-center justify-between px-4 lg:px-8 sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-md z-40">
          <h1 className="text-lg font-bold lg:hidden">{activeTab}</h1>
          <div className="hidden lg:flex items-center gap-4 bg-white/5 px-4 py-2 rounded-full border border-white/5 w-96">
            <Search className="w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar usuarios, transacciones..." 
              className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center gap-4">
            <NotificationCenter />
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10" />
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="p-4 lg:p-8">
          {activeTab === "Dashboard" && (
            <>
              <div className="mb-10">
                <h2 className="text-3xl font-bold mb-2">Panel de Control</h2>
                <p className="text-slate-500">Bienvenido al centro de mando de ImpulsaRed.</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                {[
                  { label: "Usuarios", value: stats.totalUsers.toLocaleString(), icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
                  { label: "Transacciones", value: stats.totalTransactions.toLocaleString(), icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                  { label: "Volumen", value: `$${(stats.totalVolume / 1000000).toFixed(1)}M`, icon: DollarSign, color: "text-amber-500", bg: "bg-amber-500/10" },
                  { label: "Activos", value: stats.activeUsers.toLocaleString(), icon: Activity, color: "text-purple-500", bg: "bg-purple-500/10" },
                ].map((stat, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-[#111] p-4 rounded-2xl border border-white/5"
                  >
                    <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-3`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <p className="text-slate-500 text-xs font-medium mb-1">{stat.label}</p>
                    <h3 className="text-lg font-bold tracking-tight">{stat.value}</h3>
                  </motion.div>
                ))}
              </div>

              <div className="space-y-6">
                {/* Recent Activity */}
                <div className="bg-[#111] rounded-3xl border border-white/5 overflow-hidden">
                  <div className="p-5 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-base">Actividad Reciente</h3>
                    <button 
                      onClick={() => setActiveTab("Transacciones")}
                      className="text-[10px] font-bold text-emerald-500 hover:underline uppercase tracking-widest"
                    >
                      Ver Todo
                    </button>
                  </div>
                  <div className="divide-y divide-white/5">
                    {recentActivity.length > 0 ? recentActivity.map((item, idx) => (
                      <div key={idx} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10" />
                          <div>
                            <p className="font-bold text-sm">{item.user}</p>
                            <p className="text-[10px] text-slate-500">{item.action}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {item.amount && <p className="text-xs font-bold text-emerald-500">{item.amount}</p>}
                          <p className="text-[9px] text-slate-600 font-medium">{item.time}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="p-8 text-center text-slate-500 text-sm">
                        No hay actividad reciente.
                      </div>
                    )}
                  </div>
                </div>

                {/* System Health & Support */}
                <div className="space-y-4">
                  <div className="bg-[#111] rounded-3xl border border-white/5 p-5">
                    <h3 className="font-bold text-base mb-4">Estado del Sistema</h3>
                    <div className="space-y-4">
                      {[
                        { label: "Base de Datos", status: "Online", color: "bg-emerald-500" },
                        { label: "API Gemini", status: "Estable", color: "bg-emerald-500" },
                        { label: "Servidor Auth", status: "Online", color: "bg-emerald-500" },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold">{item.status}</span>
                            <div className={`w-2 h-2 rounded-full ${item.color}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl p-5 text-white">
                    <h3 className="font-bold text-base mb-1">Soporte</h3>
                    <p className="text-emerald-100 text-xs mb-4">3 tickets pendientes.</p>
                    <button className="w-full py-2.5 bg-white text-emerald-600 font-bold rounded-xl text-xs hover:bg-emerald-50 transition-all">
                      Revisar Tickets
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "Usuarios" && <UserManagement />}
          {activeTab === "Transacciones" && <TransactionManagement />}
          {activeTab === "Tareas" && <TaskManagement />}
          {activeTab === "Cursos" && <CourseManagement />}
          {activeTab === "Configuración" && <SettingsManagement />}

        </main>
      </div>
    </div>
  );
}
