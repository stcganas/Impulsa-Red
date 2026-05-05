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
  Video,
  MessageSquare,
  Moon,
  Sun
} from "lucide-react";
import { motion } from "motion/react";
import { useUser } from "../contexts/UserContext";
import Logo from "../components/Logo";
import { useTheme } from "../contexts/ThemeContext";
import { useSettings } from "../contexts/SettingsContext";
import { supabase } from "../lib/supabase";
import UserManagement from "../components/UserManagement";
import TaskManagement from "../components/TaskManagement";
import TransactionManagement from "../components/TransactionManagement";
import CourseManagement from "../components/CourseManagement";
import SettingsManagement from "../components/SettingsManagement";
import TicketManagement from "../components/TicketManagement";
import PlanManager from "../components/admin/PlanManager";
import FeatureManager from "../components/admin/FeatureManager";
import PlanFeatureEditor from "../components/admin/PlanFeatureEditor";
import NotificationSettings from "../components/NotificationSettings";
import GlobalNotificationSender from "../components/admin/GlobalNotificationSender";

interface AdminStats {
  totalUsers: number;
  totalTransactions: number;
  totalVolume: number;
  activeUsers: number;
}

interface SystemStatus {
  database: 'up' | 'down';
  gemini_api: 'up' | 'down';
  auth_server: 'up' | 'down';
  server: 'up' | 'down';
  timestamp: string;
}

import NotificationCenter from "../components/NotificationCenter";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading, logout } = useUser();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [pendingTickets, setPendingTickets] = useState(0);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalTransactions: 0,
    totalVolume: 0,
    activeUsers: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const statsRes = await fetch('/api/admin/dashboard-data', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          mode: 'cors'
        });

        if (!statsRes.ok) {
          throw new Error('Error fetching admin stats from API');
        }

        const data = await statsRes.json();

        setStats({
          totalUsers: data.totalUsers || 0,
          totalTransactions: data.totalTransactions || 0,
          totalVolume: data.totalVolume || 0,
          activeUsers: data.activeUsers || 0
        });

        const formattedActivity = (data.recentActivity || []).map((tx: any) => {
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
        setPendingTickets(data.pendingTickets || 0);

        try {
          // Fetch System Status
          const statusRes = await fetch('/api/admin/system-status', {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            mode: 'cors'
          });
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setSystemStatus(statusData);
          }
        } catch (statusError) {
          console.error("Error fetching system status:", statusError);
        }

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
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white font-sans selection:bg-emerald-500/30 pb-20 lg:pb-0">
      {/* Sidebar Navigation (Desktop) */}
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-[#111] border-r border-slate-200 dark:border-white/5 flex-col p-6 z-50 overflow-y-auto">
        <div className="flex items-center gap-3 mb-12 px-2">
          <Logo />
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { icon: BarChart3, label: "Dashboard" },
            { icon: Users, label: "Usuarios" },
            { icon: TrendingUp, label: "Transacciones" },
            { icon: MessageSquare, label: "Tickets" },
            { icon: CheckSquare, label: "Tareas" },
            { icon: Video, label: "Cursos" },
            { icon: ShieldCheck, label: "Planes" },
            { icon: Bell, label: "Notificaciones" },
            { icon: Settings, label: "Configuración" },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(item.label)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.label 
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                  : "text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {item.label === "Tickets" && pendingTickets > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingTickets}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Bottom Navigation (Mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#111] border-t border-slate-200 dark:border-white/5 flex justify-around items-center p-2 z-50 overflow-x-auto">
        {[
          { icon: BarChart3, label: "Dashboard" },
          { icon: Users, label: "Usuarios" },
          { icon: TrendingUp, label: "Transacciones" },
          { icon: MessageSquare, label: "Tickets" },
          { icon: CheckSquare, label: "Tareas" },
          { icon: Video, label: "Cursos" },
          { icon: ShieldCheck, label: "Planes" },
          { icon: Bell, label: "Notificaciones" },
          { icon: Settings, label: "Configuración" },
        ].map((item, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(item.label)}
            className={`flex flex-col items-center gap-1 p-2 min-w-[70px] rounded-xl transition-all ${
              activeTab === item.label 
                ? "text-emerald-500" 
                : "text-slate-400 dark:text-slate-500"
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
        <header className="h-16 lg:h-20 border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-4 lg:px-8 sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-40">
          <h1 className="text-lg font-bold lg:hidden">{activeTab}</h1>
          <div className="hidden lg:flex items-center gap-4 bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-full border border-slate-200 dark:border-white/5 w-96">
            <Search className="w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar usuarios, transacciones..." 
              className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-200 dark:border-white/5"
              title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
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
                <p className="text-slate-500">Bienvenido al centro de mando de {settings.app_name || "ImpulsaRed"}.</p>
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
                    className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-slate-100 dark:border-white/5"
                  >
                    <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-3`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <p className="text-slate-500 text-xs font-medium mb-1">{stat.label}</p>
                    <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{stat.value}</h3>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-white dark:bg-[#111] rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden">
                  <div className="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">Actividad Reciente</h3>
                    <button 
                      onClick={() => setActiveTab("Transacciones")}
                      className="text-[10px] font-bold text-emerald-500 hover:underline uppercase tracking-widest"
                    >
                      Ver Todo
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {recentActivity.length > 0 ? recentActivity.map((item, idx) => (
                      <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10" />
                          <div>
                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.user}</p>
                            <p className="text-[10px] text-slate-500">{item.action}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {item.amount && <p className="text-xs font-bold text-emerald-500">{item.amount}</p>}
                          <p className="text-[9px] text-slate-400 dark:text-slate-600 font-medium">{item.time}</p>
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
                <div className="space-y-6">
                  <div className="bg-white dark:bg-[#111] rounded-3xl border border-slate-100 dark:border-white/5 p-6">
                    <h3 className="font-bold text-base mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                      <Activity className="w-5 h-5 text-emerald-500" />
                      Estado del Sistema
                    </h3>
                    <div className="space-y-5">
                      {[
                        { label: "Base de Datos", status: !systemStatus ? "Cargando..." : (systemStatus.database === 'up' ? "Online" : "Offline"), color: !systemStatus ? "bg-slate-500" : (systemStatus.database === 'up' ? "bg-emerald-500" : "bg-red-500") },
                        { label: "API Gemini", status: !systemStatus ? "Cargando..." : (systemStatus.gemini_api === 'up' ? "Estable" : "Error"), color: !systemStatus ? "bg-slate-500" : (systemStatus.gemini_api === 'up' ? "bg-emerald-500" : "bg-red-500") },
                        { label: "Servidor Auth", status: !systemStatus ? "Cargando..." : (systemStatus.auth_server === 'up' ? "Online" : "Offline"), color: !systemStatus ? "bg-slate-500" : (systemStatus.auth_server === 'up' ? "bg-emerald-500" : "bg-red-500") },
                        { label: "Servidor App", status: !systemStatus ? "Cargando..." : (systemStatus.server === 'up' ? "Online" : "Offline"), color: !systemStatus ? "bg-slate-500" : (systemStatus.server === 'up' ? "bg-emerald-500" : "bg-red-500") },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-400">{item.label}</span>
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-bold ${item.status === 'Online' || item.status === 'Estable' ? 'text-emerald-500' : 'text-red-500'}`}>
                              {item.status}
                            </span>
                            <div className={`w-2 h-2 rounded-full ${item.color} shadow-[0_0_8px_rgba(0,0,0,0.1)] dark:shadow-[0_0_8px_rgba(0,0,0,0.5)] ${item.color === 'bg-emerald-500' ? 'shadow-emerald-500/50' : 'shadow-red-500/50'}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-600 mt-6 text-center italic">
                      Última actualización: {systemStatus ? new Date(systemStatus.timestamp).toLocaleTimeString() : 'Cargando...'}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/10">
                    <h3 className="font-bold text-lg mb-1">Centro de Soporte</h3>
                    <p className="text-emerald-100 text-sm mb-6">
                      {pendingTickets > 0 
                        ? `Tienes ${pendingTickets} ticket${pendingTickets > 1 ? 's' : ''} pendiente${pendingTickets > 1 ? 's' : ''} por resolver.`
                        : "No hay tickets pendientes por ahora."}
                    </p>
                    <button 
                      onClick={() => setActiveTab("Tickets")}
                      className="w-full py-3 bg-white text-emerald-600 font-bold rounded-2xl text-sm hover:bg-emerald-50 transition-all shadow-lg shadow-black/10"
                    >
                      Gestionar Tickets
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "Usuarios" && <UserManagement />}
          {activeTab === "Transacciones" && <TransactionManagement />}
          {activeTab === "Tickets" && <TicketManagement />}
          {activeTab === "Tareas" && <TaskManagement />}
          {activeTab === "Cursos" && <CourseManagement />}
          {activeTab === "Planes" && (
            <div className="space-y-12 pb-20">
              <section>
                <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Gestión de Planes</h2>
                <PlanManager />
              </section>
              
              <section>
                <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Definición de Características</h2>
                <FeatureManager />
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Matriz de Configuración</h2>
                <PlanFeatureEditor />
              </section>
            </div>
          )}
          {activeTab === "Configuración" && <SettingsManagement />}
          {activeTab === "Notificaciones" && (
            <div className="max-w-3xl mx-auto space-y-12">
              <GlobalNotificationSender />
              <div>
                <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Configuración de Notificaciones en Vivo</h2>
                <NotificationSettings />
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
