import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Wallet as WalletIcon, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  DollarSign, 
  Loader2,
  ChevronRight,
  AlertCircle,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";

interface Transaction {
  id: number;
  amount: number;
  commission: number;
  type: 'plan_purchase' | 'referral_commission' | 'withdrawal';
  created_at: string;
  referred_name?: string;
}

export default function Wallet() {
  const { user, refreshUser } = useUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/transactions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const totalEarnings = transactions
    .filter(t => t.type === 'referral_commission')
    .reduce((acc, curr) => acc + curr.commission, 0);

  const totalWithdrawals = transactions
    .filter(t => t.type === 'withdrawal')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const balance = totalEarnings - totalWithdrawals;

  const handleWithdraw = async (e: any) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    const amount = parseInt(withdrawAmount);
    if (isNaN(amount) || amount < 10000) {
      setError("El monto mínimo de retiro es $10.000");
      return;
    }

    if (amount > balance) {
      setError("Saldo insuficiente");
      return;
    }

    setWithdrawing(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/withdraw", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess("Retiro solicitado con éxito");
        setWithdrawAmount("");
        await fetchTransactions();
        await refreshUser();
      } else {
        setError(data.error || "Error al procesar el retiro");
      }
    } catch (error) {
      setError("Error de conexión");
    } finally {
      setWithdrawing(false);
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
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-blue-600/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Mi Billetera</h1>
          <p className="text-slate-400 text-lg">Gestiona tus ganancias y retiros.</p>
        </div>
      </div>

      {/* Balance Card */}
      <div className="px-6 -mt-16 relative z-20 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <WalletIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest mb-2">Saldo Disponible</p>
          <div className="text-5xl font-black text-slate-900 tracking-tight mb-6">
            ${balance.toLocaleString("es-CO")}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Ganado</p>
              <p className="text-emerald-600 font-bold text-lg">+${totalEarnings.toLocaleString("es-CO")}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Retirado</p>
              <p className="text-slate-900 font-bold text-lg">-${totalWithdrawals.toLocaleString("es-CO")}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Withdraw Form */}
      <div className="px-6 mb-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-blue-600" />
            Solicitar Retiro
          </h2>
          
          <form onSubmit={handleWithdraw} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                {success}
              </div>
            )}
            
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Monto a retirar (Min. $10.000)"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
              />
            </div>
            
            <button
              type="submit"
              disabled={withdrawing || !withdrawAmount}
              className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {withdrawing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Confirmar Retiro"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Transactions List */}
      <div className="px-6 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" />
            Historial
          </h2>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
            <p className="text-slate-400 font-medium">No hay transacciones aún.</p>
          </div>
        ) : (
          transactions.map((t, idx) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4"
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                t.type === 'referral_commission' ? "bg-emerald-50 text-emerald-600" : 
                t.type === 'withdrawal' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
              )}>
                {t.type === 'referral_commission' ? <ArrowDownLeft className="w-6 h-6" /> : 
                 t.type === 'withdrawal' ? <ArrowUpRight className="w-6 h-6" /> : <WalletIcon className="w-6 h-6" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 truncate">
                  {t.type === 'referral_commission' ? `Comisión: ${t.referred_name}` : 
                   t.type === 'withdrawal' ? 'Retiro de Saldo' : `Compra de Plan: ${t.amount}`}
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  {new Date(t.created_at).toLocaleDateString("es-CO", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              
              <div className="text-right">
                <p className={cn(
                  "font-black text-lg",
                  t.type === 'referral_commission' ? "text-emerald-600" : 
                  t.type === 'withdrawal' ? "text-red-600" : "text-slate-900"
                )}>
                  {t.type === 'referral_commission' ? `+$${t.commission.toLocaleString("es-CO")}` : 
                   `-$${t.amount.toLocaleString("es-CO")}`}
                </p>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">Completado</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
