import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowRight, 
  TrendingUp, 
  Users, 
  Trophy, 
  ShieldCheck, 
  Zap, 
  Target,
  Sparkles,
  Rocket,
  Wallet,
  ChevronRight,
  Quote,
  Network,
  HeartHandshake,
  Gem,
  CheckCircle2,
  Globe
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import Logo from '../components/Logo';
import { cn } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';
import { supabase } from '../lib/supabase';

const LandingPage = () => {
  const { user, loading } = useUser();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from('plans')
        .select(`
          *,
          plan_features (
            value,
            features (
              key,
              name,
              description
            )
          )
        `)
        .order('price', { ascending: true });
      if (data) setPlans(data);
    };
    fetchPlans();
  }, []);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white pb-32 font-sans selection:bg-blue-500/30">
      
      {/* App Header (Sticky) */}
      <header className="fixed top-0 w-full z-40 bg-white/90 dark:bg-black/90 backdrop-blur-lg border-b border-slate-200 dark:border-white/10 px-6 py-4 flex justify-between items-center">
        <Logo />
        <Link 
          to="/login" 
          className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-4 py-2 rounded-full active:scale-95 transition-transform"
        >
          Ingresar
        </Link>
      </header>

      {/* Hero Section (App Onboarding Style) */}
      <section className="pt-28 pb-12 px-6 bg-white dark:bg-[#111] rounded-b-[2.5rem] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <div className="inline-flex items-center gap-2 py-1.5 px-3 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              El futuro es colaborativo
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black leading-[1.1] tracking-tight mb-4">
            Construye tu <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">
              Libertad Financiera
            </span>
          </h1>
          
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed mb-8">
            Únete a la red donde crecer financieramente es un deporte de equipo. Invita amigos, sube de nivel y genera ingresos pasivos reales.
          </p>

          <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
            <div className="flex -space-x-3">
              {[1, 2, 3].map(i => (
                <img key={i} src={`https://i.pravatar.cc/100?u=${i}`} className="w-10 h-10 rounded-full border-2 border-white dark:border-[#111]" alt="User" />
              ))}
            </div>
            <div className="text-sm font-medium">
              <span className="font-bold text-slate-900 dark:text-white">+15,000</span> ya están creando su red.
            </div>
          </div>
        </motion.div>
      </section>

      {/* Motivational Quote */}
      <section className="px-6 py-8 mt-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-blue-900/40 dark:to-emerald-900/20 p-8 rounded-[2rem] text-white relative overflow-hidden shadow-xl"
        >
          <Quote className="absolute top-4 right-4 w-24 h-24 text-white/5 -rotate-12" />
          <p className="text-xl md:text-2xl font-medium leading-snug mb-6 relative z-10 italic">
            "El mejor momento para plantar un árbol fue hace 20 años. El segundo mejor momento para empezar a construir tu riqueza es <span className="font-black text-emerald-400">hoy</span>."
          </p>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider text-slate-300">Tu momento ha llegado</span>
          </div>
        </motion.div>
      </section>

      {/* The Model: Red de Amigos Financieros */}
      <section className="px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-black tracking-tight mb-2">Red de Amigos Financieros</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            No trabajes solo. Nuestro modelo de 3 niveles te permite ganar por el éxito de toda tu comunidad.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              icon: <HeartHandshake className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
              bg: "bg-blue-100 dark:bg-blue-500/20",
              title: "Nivel 1: Tus Amigos",
              desc: "Invita a tus conocidos directos y gana la comisión más alta por cada uno que se una a la red."
            },
            {
              icon: <Network className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
              bg: "bg-emerald-100 dark:bg-emerald-500/20",
              title: "Nivel 2: La Expansión",
              desc: "Cuando tus amigos invitan a sus amigos, tú también ganas. Tu red empieza a trabajar para ti."
            },
            {
              icon: <Globe className="w-6 h-6 text-violet-600 dark:text-violet-400" />,
              bg: "bg-violet-100 dark:bg-violet-500/20",
              title: "Nivel 3: Ingreso Pasivo",
              desc: "La red se expande sola. Recibe comisiones automáticas por el crecimiento exponencial de tu equipo."
            }
          ].map((step, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white dark:bg-[#111] p-5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm flex gap-4 items-start"
            >
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", step.bg)}>
                {step.icon}
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">{step.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Plans (Native Horizontal Scroll) */}
      <section className="py-8">
        <div className="px-6 mb-6">
          <h2 className="text-3xl font-black tracking-tight mb-2">Elige tu Impulso</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
            Desliza para ver los planes diseñados para escalar tus ingresos.
          </p>
        </div>

        {/* Horizontal Scroll Container */}
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-8 px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {plans.map((plan) => {
            const isPremium = plan.name.toLowerCase().includes('elite') || plan.name.toLowerCase().includes('élite');
            const baseCommission = plan.plan_features?.find((f: any) => f.features?.key === 'commission_level_1')?.value || "0";
            
            return (
              <div 
                key={plan.id}
                className={cn(
                  "snap-center shrink-0 w-[85vw] max-w-[320px] rounded-[2.5rem] p-8 shadow-lg relative overflow-hidden",
                  isPremium 
                    ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white" 
                    : "bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10"
                )}
              >
                {isPremium && (
                  <div className="absolute top-0 right-0 bg-white/20 px-4 py-1.5 rounded-bl-2xl text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                    Recomendado
                  </div>
                )}
                
                <h3 className={cn("text-2xl font-black mb-1", isPremium ? "text-white" : "text-slate-900 dark:text-white")}>
                  {plan.name}
                </h3>
                <div className={cn("text-4xl font-black tracking-tight mb-6", isPremium ? "text-white" : "text-slate-900 dark:text-white")}>
                  ${plan.price.toLocaleString('es-CO')}
                </div>

                <div className={cn(
                  "rounded-2xl p-4 mb-6",
                  isPremium ? "bg-black/20" : "bg-slate-50 dark:bg-white/5"
                )}>
                  <div className={cn("text-xs font-bold uppercase tracking-wider mb-1", isPremium ? "text-white/80" : "text-slate-500")}>
                    Comisión Base
                  </div>
                  <div className={cn("text-3xl font-black", isPremium ? "text-white" : "text-blue-600 dark:text-blue-400")}>
                    {Number(baseCommission) * 100}%
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.plan_features?.slice(0, 3).map((pf: any, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className={cn("w-5 h-5 shrink-0", isPremium ? "text-white/80" : "text-blue-500")} />
                      <span className={cn("text-sm font-medium leading-tight", isPremium ? "text-white/90" : "text-slate-600 dark:text-slate-300")}>
                        {pf.features?.name}: <span className="font-bold">{pf.value === 'true' ? 'Sí' : pf.value === 'false' ? 'No' : pf.value}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                <Link 
                  to="/onboarding"
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 active:scale-95",
                    isPremium 
                      ? "bg-white text-orange-600 shadow-xl" 
                      : "bg-slate-900 dark:bg-blue-600 text-white shadow-lg"
                  )}
                >
                  <span>Elegir {plan.name}</span>
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features Grid (App Style) */}
      <section className="px-6 py-8">
        <h2 className="text-2xl font-black tracking-tight mb-6">Herramientas Pro</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: <Wallet className="w-6 h-6" />, title: "Pagos Rápidos", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
            { icon: <Trophy className="w-6 h-6" />, title: "Gamificación", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" },
            { icon: <ShieldCheck className="w-6 h-6" />, title: "Seguro", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
            { icon: <Zap className="w-6 h-6" />, title: "Motor Viral", color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-500/10" },
          ].map((feat, i) => (
            <div key={i} className="bg-white dark:bg-[#111] p-5 rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col items-center text-center gap-3 shadow-sm">
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", feat.bg, feat.color)}>
                {feat.icon}
              </div>
              <span className="font-bold text-sm">{feat.title}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Sticky Bottom CTA (Mobile First) */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-black dark:via-black z-50 pointer-events-none">
        <div className="pointer-events-auto max-w-md mx-auto">
          <Link 
            to="/onboarding" 
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-[0_10px_40px_rgba(37,99,235,0.4)] active:scale-95 transition-transform"
          >
            <span>Comenzar mi Imperio</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

    </div>
  );
};

export default LandingPage;
