import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  TrendingUp,
  DollarSign,
  Settings,
  Bell,
  Search,
  ChevronRight,
  ShieldCheck,
  BarChart3,
  Activity,
  LogOut
} from "lucide-react";
import { motion } from "motion/react";
import { useUser } from "../contexts/UserContext";

interface AdminStats {
  totalUsers: number;
  totalTransactions: number;
  totalVolume: number;
  activeUsers: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading, logout } = useUser();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalTransactions: 0,
    totalVolume: 0,
    activeUsers: 0
  });

  // Mock stats for now - in a real app these would come from an API
  useEffect(() => {
    setStats({
      totalUsers: 1248,
      totalTransactions: 5672,
      totalVolume: 45000000,
      activeUsers: 856
    });
  }, []);

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
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-emerald-500/30">
      {/* Sidebar Navigation (Desktop) */}
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-[#111] border-r border-white/5 flex-col p-6 z-50">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">Impulsa<span className="text-emerald-500">Admin</span></span>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { icon: BarChart3, label: "Dashboard", active: true },
            { icon: Users, label: "Usuarios" },
            { icon: TrendingUp, label: "Transacciones" },
            { icon: Activity, label: "Métricas" },
            { icon: Settings, label: "Configuración" },
          ].map((item, idx) => (
            <button
              key={idx}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                item.active 
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

      {/* Main Content Area */}
      <div className="lg:pl-64 min-h-screen">
        {/* Top Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-md z-40">
          <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-full border border-white/5 w-96">
            <Search className="w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar usuarios, transacciones..." 
              className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[#0a0a0a]" />
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold">{user.name}</p>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Super Admin</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10" />
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </header>

        <main className="p-8">
          <div className="mb-10">
            <h2 className="text-3xl font-bold mb-2">Panel de Control</h2>
            <p className="text-slate-500">Bienvenido al centro de mando de ImpulsaRed.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {[
              { label: "Usuarios Totales", value: stats.totalUsers.toLocaleString(), icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
              { label: "Transacciones", value: stats.totalTransactions.toLocaleString(), icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
              { label: "Volumen Total", value: `$${(stats.totalVolume / 1000000).toFixed(1)}M`, icon: DollarSign, color: "text-amber-500", bg: "bg-amber-500/10" },
              { label: "Usuarios Activos", value: stats.activeUsers.toLocaleString(), icon: Activity, color: "text-purple-500", bg: "bg-purple-500/10" },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-[#111] p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">+12.5%</span>
                </div>
                <p className="text-slate-500 text-sm font-medium mb-1">{stat.label}</p>
                <h3 className="text-2xl font-bold tracking-tight">{stat.value}</h3>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Recent Activity */}
            <div className="lg:col-span-2 bg-[#111] rounded-3xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-lg">Actividad Reciente</h3>
                <button className="text-xs font-bold text-emerald-500 hover:underline uppercase tracking-widest">Ver Todo</button>
              </div>
              <div className="divide-y divide-white/5">
                {[
                  { user: "Juan Pérez", action: "Compra Plan Pro", time: "Hace 2 min", amount: "$150.000" },
                  { user: "María García", action: "Nuevo Registro", time: "Hace 15 min", amount: null },
                  { user: "Carlos Ruiz", action: "Retiro Solicitado", time: "Hace 1 hora", amount: "$45.000" },
                  { user: "Ana López", action: "Nivel Alcanzado (15)", time: "Hace 3 horas", amount: null },
                  { user: "Roberto Díaz", action: "Compra Plan Élite", time: "Hace 5 horas", amount: "$300.000" },
                ].map((item, idx) => (
                  <div key={idx} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10" />
                      <div>
                        <p className="font-bold text-sm">{item.user}</p>
                        <p className="text-xs text-slate-500">{item.action}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {item.amount && <p className="text-sm font-bold text-emerald-500">{item.amount}</p>}
                      <p className="text-[10px] text-slate-600 font-medium">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Health */}
            <div className="space-y-8">
              <div className="bg-[#111] rounded-3xl border border-white/5 p-6">
                <h3 className="font-bold text-lg mb-6">Estado del Sistema</h3>
                <div className="space-y-6">
                  {[
                    { label: "Base de Datos", status: "Online", color: "bg-emerald-500" },
                    { icon: TrendingUp, label: "API Gemini", status: "Estable", color: "bg-emerald-500" },
                    { icon: TrendingUp, label: "Servidor Auth", status: "Online", color: "bg-emerald-500" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">{item.status}</span>
                        <div className={`w-2 h-2 rounded-full ${item.color} shadow-[0_0_8px_rgba(16,185,129,0.5)]`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/20">
                <h3 className="font-bold text-lg mb-2">Soporte Prioritario</h3>
                <p className="text-emerald-100 text-sm mb-6">Tienes 3 tickets pendientes de revisión por el equipo técnico.</p>
                <button className="w-full py-3 bg-white text-emerald-600 font-bold rounded-xl text-sm hover:bg-emerald-50 transition-all">
                  Revisar Tickets
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
