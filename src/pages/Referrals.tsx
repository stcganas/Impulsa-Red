import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Users, DollarSign, TrendingUp, UserPlus, Copy, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";
import { supabase } from "../lib/supabase";

interface Referral {
  id: string;
  name: string;
  plan: string;
  created_at: string;
  total_commission: number;
}

export default function Referrals() {
  const { user } = useUser();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchReferrals = async () => {
    if (!user?.id) return;
    
    try {
      // Fetch referrals where the current user is the referrer
      const { data: referralData, error: referralError } = await supabase
        .from('referrals')
        .select(`
          created_at,
          referred_id,
          users!referrals_referred_id_fkey (
            id,
            name,
            plan
          )
        `)
        .eq('referrer_id', user.id);

      if (referralError) throw referralError;

      // Fetch commissions for these referrals
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('referred_id, amount')
        .eq('user_id', user.id)
        .eq('type', 'referral_commission')
        .eq('status', 'completed');

      if (txError) throw txError;

      // Combine data
      const formattedReferrals: Referral[] = (referralData || []).map((ref: any) => {
        const referredUser = ref.users;
        const commissions = (txData || [])
          .filter(tx => tx.referred_id === referredUser.id)
          .reduce((sum, tx) => sum + (tx.amount || 0), 0);

        return {
          id: referredUser.id,
          name: referredUser.name,
          plan: referredUser.plan,
          created_at: ref.created_at,
          total_commission: commissions
        };
      });

      setReferrals(formattedReferrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, [user?.id]);

  const totalMonthly = referrals.reduce(
    (acc, curr) => acc + (curr.total_commission || 0),
    0,
  );

  const copyCode = () => {
    if (user?.referral_code) {
      navigator.clipboard.writeText(user.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 relative overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white pt-12 pb-24 px-6 rounded-b-[40px] shadow-xl relative">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[120%] bg-emerald-600/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Mis Referidos
            </h1>
            <p className="text-slate-400 text-lg">
              Tu red de crecimiento financiero.
            </p>
          </div>
          <button className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
            <UserPlus className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Referral Code Card */}
      <div className="px-6 -mt-16 relative z-20 mb-8 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100"
        >
          <p className="text-slate-500 font-medium text-sm uppercase tracking-wider mb-4">
            Mi Código de Referido
          </p>
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200">
            <div className="flex-1 font-black text-2xl tracking-widest text-slate-900">
              {user?.referral_code}
            </div>
            <button
              onClick={copyCode}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-90",
                copied ? "bg-emerald-500 text-white" : "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
              )}
            >
              {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center font-medium">
            Comparte este código para ganar comisiones y XP.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 shadow-xl shadow-emerald-500/20 text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex justify-between items-center mb-2 relative z-10">
            <p className="font-medium text-emerald-100 uppercase tracking-wider text-sm">
              Comisiones Totales
            </p>
            <TrendingUp className="w-5 h-5 text-emerald-200" />
          </div>
          <div className="text-4xl font-black tracking-tight relative z-10">
            ${totalMonthly.toLocaleString("es-CO")}
          </div>
        </motion.div>
      </div>

      {/* Referrals List */}
      <div className="px-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-900">
            Historial de Red
          </h2>
          <span className="text-slate-400 font-bold text-sm">
            {referrals.length} Miembros
          </span>
        </div>

        {referrals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Aún no tienes referidos.</p>
            <p className="text-slate-400 text-sm">¡Comparte tu código para empezar!</p>
          </div>
        ) : (
          referrals.map((ref, idx) => (
            <motion.div
              key={ref.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg">
                    {ref.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{ref.name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(ref.created_at).toLocaleDateString("es-CO", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                    ref.plan === "Élite"
                      ? "bg-amber-100 text-amber-700"
                      : ref.plan === "Pro"
                        ? "bg-emerald-100 text-emerald-700"
                        : ref.plan === "Avanzado"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-700",
                  )}
                >
                  {ref.plan}
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-50 rounded-xl p-3">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Comisión Generada
                </p>
                <p className="font-black text-emerald-600 flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  {(ref.total_commission || 0).toLocaleString("es-CO")}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
