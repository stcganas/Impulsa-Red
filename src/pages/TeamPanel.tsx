import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, Award, UserPlus, Shield, MessageSquare, Target, Lock } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useFeatures } from '../contexts/FeatureContext';
import { supabase } from '../lib/supabase';

interface TeamMember {
  id: string;
  name: string;
  level: number;
  plan: string;
  status: string;
  created_at: string;
}

interface TeamStats {
  leaderLevel: string;
  activeDirects: number;
  totalDirects: number;
  totalEarnings: number;
  teamMembers: TeamMember[];
}

export default function TeamPanel() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getUserFeature } = useFeatures();
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);

  const canCreateTeam = getUserFeature('can_create_team');
  const commissionLevel2 = getUserFeature('commission_level_2');
  const commissionLevel3 = getUserFeature('commission_level_3');

  useEffect(() => {
    const fetchTeamStats = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch('/api/team/summary', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Error fetching team stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!stats) return null;

  // If the user doesn't have the feature, they can't see the full panel
  const hasAccess = canCreateTeam === true;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-24">
      {/* Header */}
      <div className="bg-slate-900 dark:bg-[#111] text-white pt-12 pb-24 px-6 rounded-b-[40px] shadow-xl relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-emerald-600/20 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Panel de Líder
          </h1>
          <p className="text-slate-400 text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Nivel: <span className="text-white font-semibold">{stats.leaderLevel}</span>
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-6 -mt-16 relative z-20 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#111] p-4 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-white/5"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Referidos Activos</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.activeDirects}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-[#111] p-4 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-white/5"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Ganancias de Red</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">${stats.totalEarnings.toLocaleString('es-CO')}</p>
          </motion.div>
        </div>
      </div>

      {!hasAccess ? (
        <div className="px-6">
          <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-8 text-center">
            <div className="w-16 h-16 bg-slate-200 dark:bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Función Bloqueada</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Tu plan actual no incluye herramientas avanzadas de gestión de equipo. Mejora tu plan para desbloquear el Panel de Líder.
            </p>
            <button 
              onClick={() => navigate("/plans")}
              className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
            >
              Ver Planes Disponibles
            </button>
          </div>
        </div>
      ) : (
        <div className="px-6 space-y-6">
          {/* Multi-level Info */}
          {(commissionLevel2 || commissionLevel3) && (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 text-white flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-1">Beneficio Activo</p>
                <p className="font-bold text-sm">
                  Comisiones hasta Nivel {commissionLevel3 ? '3' : '2'} habilitadas
                </p>
              </div>
              <Award className="w-8 h-8 text-white/30" />
            </div>
          )}

          {/* Tools */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Herramientas de Líder</h2>
            <div className="grid grid-cols-2 gap-4">
              <button className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm flex flex-col items-center justify-center gap-2 hover:border-emerald-500/50 transition-colors">
                <MessageSquare className="w-6 h-6 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Mensaje al Equipo</span>
              </button>
              <button className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm flex flex-col items-center justify-center gap-2 hover:border-blue-500/50 transition-colors">
                <Target className="w-6 h-6 text-blue-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Asignar Retos</span>
              </button>
            </div>
          </div>

          {/* Team List */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Mi Red</h2>
            <div className="space-y-3">
              {stats.teamMembers.map((member) => {
                const isActive = member.plan && member.plan.toLowerCase() !== 'básico' && member.plan.toLowerCase() !== 'gratis' && member.plan.toLowerCase() !== 'free';
                
                // Only show members up to the allowed level
                const maxLevel = commissionLevel3 ? 3 : (commissionLevel2 ? 2 : 1);
                if (member.level > maxLevel) return null;

                return (
                  <div key={member.id} className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <UserPlus className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{member.name}</p>
                        <p className="text-xs text-slate-500">Nivel {member.level} • {member.plan}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      isActive 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {isActive ? 'Activo' : 'Inactivo'}
                    </div>
                  </div>
                );
              })}
              
              {stats.teamMembers.length === 0 && (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  Aún no tienes referidos en tu red.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
