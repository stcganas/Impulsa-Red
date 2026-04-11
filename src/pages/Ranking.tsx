import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Trophy, Medal, Star, Crown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";
import { useSettings } from "../contexts/SettingsContext";
import { supabase } from "../lib/supabase";

interface RankedUser {
  id: string;
  name: string;
  level: number;
  xp: number;
  plan: string;
  percentage: number;
  avatar_url: string | null;
  wallet_balance: number;
}

export default function Ranking() {
  const { user } = useUser();
  const { settings } = useSettings();
  const [leaderboard, setLeaderboard] = useState<RankedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, level, xp, plan, percentage, avatar_url, wallet_balance')
          .order('xp', { ascending: false })
          .limit(50);
          
        if (error) throw error;
        
        setLeaderboard(data as RankedUser[]);
      } catch (error) {
        console.error("Error fetching ranking:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-24 relative overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 dark:bg-[#111] text-white pt-12 pb-24 px-6 rounded-b-[40px] shadow-xl relative transition-colors duration-300">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[120%] bg-amber-600/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Ranking Global
            </h1>
            <p className="text-slate-400 text-lg">
              Los líderes de la comunidad {settings.app_name || "ImpulsaRed"}.
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="px-6 -mt-12 relative z-20 mb-8 flex justify-center items-end gap-2 sm:gap-4 h-48">
        {/* 2nd Place */}
        {leaderboard[1] && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center flex-1"
          >
            <div className="relative mb-2">
              {leaderboard[1].avatar_url ? (
                <img src={leaderboard[1].avatar_url} alt={leaderboard[1].name} className="w-14 h-14 rounded-full border-4 border-white dark:border-[#111] shadow-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shadow-lg border-4 border-white dark:border-[#111] z-10">
                  <span className="font-bold text-slate-600 dark:text-slate-400">2</span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center border-2 border-white dark:border-[#111]">
                <Medal className="w-3 h-3 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
            <div className="bg-white dark:bg-[#111] w-full rounded-t-2xl pt-6 pb-4 px-2 text-center shadow-lg border border-slate-100 dark:border-white/5 h-28 flex flex-col justify-end">
              <p className="font-bold text-slate-900 dark:text-slate-200 text-sm truncate w-full">{leaderboard[1].name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-500 font-medium mt-1">Nivel {leaderboard[1].level}</p>
              <p className="text-xs font-black text-amber-500 mt-1">{leaderboard[1].xp} XP</p>
            </div>
          </motion.div>
        )}

        {/* 1st Place */}
        {leaderboard[0] && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center flex-[1.2] z-10"
          >
            <div className="relative mb-2">
              <Crown className="w-8 h-8 text-amber-400 absolute -top-6 left-1/2 -translate-x-1/2 drop-shadow-sm" />
              {leaderboard[0].avatar_url ? (
                <img src={leaderboard[0].avatar_url} alt={leaderboard[0].name} className="w-20 h-20 rounded-full border-4 border-amber-400 shadow-xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-xl shadow-amber-500/30 border-4 border-white dark:border-[#111]">
                  <span className="font-black text-white text-xl">1</span>
                </div>
              )}
            </div>
            <div className="bg-white dark:bg-[#111] w-full rounded-t-2xl pt-8 pb-4 px-2 text-center shadow-xl border border-slate-100 dark:border-white/5 h-36 flex flex-col justify-end">
              <p className="font-black text-slate-900 dark:text-white text-base truncate w-full">{leaderboard[0].name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 font-medium mt-1">Nivel {leaderboard[0].level}</p>
              <p className="text-sm font-black text-amber-500 mt-1">{leaderboard[0].xp} XP</p>
            </div>
          </motion.div>
        )}

        {/* 3rd Place */}
        {leaderboard[2] && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center flex-1"
          >
            <div className="relative mb-2">
              {leaderboard[2].avatar_url ? (
                <img src={leaderboard[2].avatar_url} alt={leaderboard[2].name} className="w-14 h-14 rounded-full border-4 border-white dark:border-[#111] shadow-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-orange-200 dark:bg-orange-900/30 flex items-center justify-center shadow-lg border-4 border-white dark:border-[#111] z-10">
                  <span className="font-bold text-orange-700 dark:text-orange-500">3</span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange-200 dark:bg-orange-900/30 rounded-full flex items-center justify-center border-2 border-white dark:border-[#111]">
                <Medal className="w-3 h-3 text-orange-700 dark:text-orange-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-[#111] w-full rounded-t-2xl pt-6 pb-4 px-2 text-center shadow-lg border border-slate-100 dark:border-white/5 h-24 flex flex-col justify-end">
              <p className="font-bold text-slate-900 dark:text-slate-200 text-sm truncate w-full">{leaderboard[2].name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-500 font-medium mt-1">Nivel {leaderboard[2].level}</p>
              <p className="text-xs font-black text-amber-500 mt-1">{leaderboard[2].xp} XP</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Leaderboard List */}
      <div className="px-6 space-y-3 pb-24">
        {leaderboard.slice(3).map((rankedUser, index) => (
          <motion.div
            key={rankedUser.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "bg-white dark:bg-[#111] rounded-2xl p-4 flex items-center gap-4 shadow-sm border transition-all",
              user?.id === rankedUser.id 
                ? "border-emerald-500 shadow-emerald-100 dark:shadow-emerald-900/20 bg-emerald-50/50 dark:bg-emerald-500/5" 
                : "border-slate-100 dark:border-white/5"
            )}
          >
            <div className="w-8 text-center font-bold text-slate-400 dark:text-slate-600">
              {index + 4}
            </div>
            
            {rankedUser.avatar_url ? (
              <img src={rankedUser.avatar_url} alt={rankedUser.name} className="w-10 h-10 rounded-full object-cover border border-slate-100 dark:border-white/5" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center font-bold text-slate-600 dark:text-slate-400">
                {rankedUser.name.charAt(0).toUpperCase()}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-200 truncate">{rankedUser.name}</h3>
                {user?.id === rankedUser.id && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase">
                    Tú
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">
                <span className="font-bold text-emerald-600 uppercase">Nivel {rankedUser.level}</span>
                <span>•</span>
                <span className="truncate">{getBadge(rankedUser.level)}</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="font-black text-amber-500 text-sm">{rankedUser.xp} XP</div>
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">
                ${(rankedUser.wallet_balance || 0).toLocaleString('es-CO')}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Sticky My Position */}
      {user && !leaderboard.slice(0, 50).some(u => u.id === user.id) && (
        <div className="fixed bottom-20 left-0 right-0 px-6 z-30">
          <div className="bg-slate-900 dark:bg-[#111] text-white rounded-2xl p-4 flex items-center gap-4 shadow-2xl border border-white/10">
            <div className="w-8 text-center font-bold text-slate-400">
              ?
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">Tu Posición</p>
              <p className="text-[10px] text-slate-400">Sigue ganando XP para entrar al Top 50</p>
            </div>
            <div className="text-right">
              <div className="font-black text-amber-500 text-sm">{user.xp || 0} XP</div>
              <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mt-0.5">
                Nivel {user.level || 1}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
