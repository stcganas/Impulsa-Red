import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowRight, 
  TrendingUp, 
  Users, 
  Trophy, 
  Shield, 
  Zap, 
  Target,
  Sparkles,
  Rocket,
  ShieldCheck,
  Globe,
  Wallet,
  MessageSquare,
  ChevronRight,
  Star,
  Menu,
  X,
  CheckSquare,
  PlayCircle,
  Award,
  BarChart3
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import Logo from '../components/Logo';
import { cn } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';

const LandingPage = () => {
  const { user, loading } = useUser();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, loading, navigate]);

  if (loading) return null;

  const features = [
    {
      icon: <TrendingUp className="w-6 h-6 text-white" />,
      color: "bg-blue-500",
      title: "Crecimiento Exponencial",
      description: "Sistema de interés compuesto aplicado a tu red de referidos."
    },
    {
      icon: <Users className="w-6 h-6 text-white" />,
      color: "bg-emerald-500",
      title: "Red Multinivel",
      description: "Gana comisiones hasta en 3 niveles de profundidad."
    },
    {
      icon: <Sparkles className="w-6 h-6 text-white" />,
      color: "bg-violet-500",
      title: "Mentoría con IA",
      description: "Asistente inteligente 24/7 para optimizar tu estrategia."
    },
    {
      icon: <Rocket className="w-6 h-6 text-white" />,
      color: "bg-orange-500",
      title: "Motor Viral",
      description: "Herramientas de automatización para WhatsApp y redes."
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-white" />,
      color: "bg-indigo-500",
      title: "Seguridad Total",
      description: "Pagos verificados y protección de datos de grado bancario."
    },
    {
      icon: <Trophy className="w-6 h-6 text-white" />,
      color: "bg-amber-500",
      title: "Gamificación",
      description: "Sube de nivel y desbloquea beneficios exclusivos."
    }
  ];

  const stats = [
    { label: "Usuarios Activos", value: "15k+" },
    { label: "Comisiones Pagadas", value: "$2.5M+" },
    { label: "Países", value: "12+" },
    { label: "Satisfacción", value: "98%" }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-white font-sans transition-colors duration-300 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-slate-100 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <Logo />
            </div>
            
            <div className="hidden lg:flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              <a href="#features" className="hover:text-blue-600 transition-colors">Características</a>
              <a href="#stats" className="hover:text-blue-600 transition-colors">Impacto</a>
              <a href="#cta" className="hover:text-blue-600 transition-colors">Empezar</a>
            </div>

            <div className="flex items-center gap-4">
              <Link 
                to="/login" 
                className="hidden sm:block text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-colors"
              >
                Entrar
              </Link>
              <Link 
                to="/onboarding" 
                className="bg-slate-900 dark:bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
              >
                Unirse
              </Link>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <motion.div
          initial={false}
          animate={isMenuOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
          className="lg:hidden overflow-hidden bg-white dark:bg-[#0a0a0a] border-b border-slate-100 dark:border-white/5"
        >
          <div className="px-6 py-8 flex flex-col gap-6 text-lg font-black uppercase tracking-widest">
            <a href="#features" onClick={() => setIsMenuOpen(false)} className="hover:text-blue-600 transition-colors">Características</a>
            <a href="#stats" onClick={() => setIsMenuOpen(false)} className="hover:text-blue-600 transition-colors">Impacto</a>
            <a href="#cta" onClick={() => setIsMenuOpen(false)} className="hover:text-blue-600 transition-colors">Empezar</a>
            <Link to="/login" onClick={() => setIsMenuOpen(false)} className="text-slate-400">Entrar</Link>
          </div>
        </motion.div>
      </nav>

      {/* Hero Section - Recipe 2 Inspired */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 py-2 px-4 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Plataforma Líder en Crecimiento Colaborativo
              </span>
            </div>

            <h1 className="text-5xl md:text-[120px] font-black leading-[0.9] md:leading-[0.85] tracking-tighter text-slate-900 dark:text-white mb-8">
              TU RED ES <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-emerald-500 to-violet-600">
                TU PODER
              </span>
            </h1>

            <p className="text-lg md:text-2xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto mb-12 font-medium leading-relaxed px-4">
              La primera plataforma que transforma tus conexiones en libertad financiera real mediante gamificación y tecnología de punta.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <Link 
                to="/onboarding" 
                className="w-full sm:w-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-10 py-5 rounded-[2rem] text-xl font-black uppercase tracking-tighter hover:scale-105 transition-all shadow-2xl flex items-center justify-center gap-3 group"
              >
                Empezar Ahora
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Link>
              <div className="flex flex-col items-center sm:items-start gap-3">
                <div className="flex -space-x-4">
                  {[1, 2, 3, 4].map(i => (
                    <img 
                      key={i}
                      src={`https://i.pravatar.cc/100?u=${i}`} 
                      className="w-12 h-12 rounded-full border-4 border-white dark:border-[#0a0a0a] object-cover shadow-lg"
                      alt="User"
                    />
                  ))}
                  <div className="w-12 h-12 rounded-full bg-blue-600 border-4 border-white dark:border-[#0a0a0a] flex items-center justify-center text-white text-xs font-bold">
                    +2k
                  </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Usuarios activos hoy</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="mt-20 relative max-w-5xl mx-auto"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-[3rem] blur-2xl opacity-20" />
            <div className="relative bg-white dark:bg-[#111] rounded-[2.5rem] p-4 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
              <img 
                src="https://picsum.photos/seed/app-preview/1600/900" 
                alt={`${settings.app_name || "ImpulsaRed"} App`} 
                className="rounded-[1.5rem] w-full shadow-inner"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live Activity - Veracidad */}
      <section className="py-12 bg-white dark:bg-[#0a0a0a] border-b border-slate-100 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-6 overflow-hidden">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Actividad en tiempo real</h3>
          </div>
          <div className="flex gap-8 animate-marquee whitespace-nowrap">
            {[
              "Carlos acaba de recibir $50 de comisión",
              "Nueva red iniciada en Madrid, España",
              "María alcanzó el Nivel Platino",
              "Pago verificado de $120 enviado a Juan",
              "34 nuevos usuarios se unieron en la última hora",
              `${settings.app_name || "ImpulsaRed"} ya está disponible en 15 países`
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 px-6 py-3 rounded-full border border-slate-100 dark:border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section - Veracidad */}
      <section id="stats" className="py-20 bg-slate-50 dark:bg-white/5 border-y border-slate-200 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter">
                  {stat.value}
                </div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Colorful Icons */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div className="max-w-2xl">
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 dark:text-white mb-6 leading-none">
                TECNOLOGÍA <br />
                PARA TU ÉXITO
              </h2>
              <p className="text-xl text-slate-500 dark:text-slate-400 font-medium">
                Hemos construido las herramientas más potentes del mercado para que tu único trabajo sea crecer.
              </p>
            </div>
            <div className="flex flex-col items-end gap-4">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className="w-5 h-5 text-amber-500 fill-amber-500" />
                ))}
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Calificación 4.9/5 en Trustpilot</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -10 }}
                className="group p-10 rounded-[3rem] bg-white dark:bg-[#111] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all flex flex-col items-start"
              >
                <div className={cn(
                  "w-20 h-20 rounded-3xl flex items-center justify-center mb-10 shadow-xl transform group-hover:rotate-12 transition-transform",
                  feature.color
                )}>
                  {feature.icon}
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed text-lg">
                  {feature.description}
                </p>
                <div className="mt-auto pt-10 flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  Saber más <ChevronRight className="w-4 h-4" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 px-6 bg-slate-900 dark:bg-[#111] text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:40px_40px]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-none">
                VERACIDAD <br />
                Y CONFIANZA
              </h2>
              <div className="space-y-8">
                {[
                  {
                    title: "Transparencia Total",
                    desc: "Cada comisión es rastreable y se paga instantáneamente a tu billetera."
                  },
                  {
                    title: "Comunidad Real",
                    desc: "Miles de testimonios verificados de personas que han cambiado su vida."
                  },
                  {
                    title: "Soporte 24/7",
                    desc: "Un equipo humano y nuestra IA siempre listos para ayudarte."
                  }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <CheckSquare className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                      <p className="text-slate-400 font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-blue-600 to-emerald-500 rounded-[3rem] p-1 shadow-2xl">
                <img 
                  src="https://picsum.photos/seed/trust/800/800" 
                  className="w-full h-full object-cover rounded-[2.8rem]"
                  alt="Trust"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-10 -left-10 bg-white dark:bg-[#0a0a0a] p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Certificado</p>
                    <p className="font-black text-slate-900 dark:text-white">Seguridad Nivel 4</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500 font-medium">Protección de activos garantizada por protocolos descentralizados.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Highly Tentative */}
      <section id="cta" className="py-40 px-6 text-center relative">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-9xl font-black tracking-tighter text-slate-900 dark:text-white mb-12 leading-none">
              ¿ESTÁS <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">
                LISTO?
              </span>
            </h2>
            <p className="text-2xl text-slate-500 dark:text-slate-400 font-medium mb-16 max-w-2xl mx-auto">
              No dejes que otro tome tu lugar. El momento de construir tu imperio digital es ahora.
            </p>
            <Link 
              to="/onboarding" 
              className="inline-flex bg-blue-600 text-white px-16 py-8 rounded-[3rem] text-3xl font-black uppercase tracking-tighter hover:scale-110 transition-all shadow-[0_20px_50px_rgba(37,99,235,0.3)] active:scale-95 group"
            >
              Unirse a la Red
              <Zap className="w-8 h-8 ml-4 fill-white group-hover:animate-bounce" />
            </Link>
            <p className="mt-12 text-slate-400 font-bold uppercase tracking-widest text-xs">
              Registro gratuito · Sin compromiso · Resultados reales
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-100 dark:border-white/5 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="flex items-center gap-3">
              <Logo />
            </div>
            
            <div className="flex gap-12 text-sm font-black uppercase tracking-widest text-slate-400">
              <a href="#" className="hover:text-blue-600 transition-colors">Privacidad</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Términos</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Soporte</a>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all cursor-pointer">
                <Globe className="w-5 h-5" />
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all cursor-pointer">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
          </div>
          <div className="mt-20 pt-10 border-t border-slate-100 dark:border-white/5 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
            © 2026 {settings.app_name || "ImpulsaRed"}. Diseñado para el éxito masivo.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
