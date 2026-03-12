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
  Target 
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';

const LandingPage = () => {
  const { user, loading } = useUser();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">ImpulsaRed</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
              <a href="#features" className="hover:text-emerald-600 transition-colors">Características</a>
              <a href="#how-it-works" className="hover:text-emerald-600 transition-colors">Cómo funciona</a>
              <a href="#benefits" className="hover:text-emerald-600 transition-colors">Beneficios</a>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                to="/login" 
                className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors"
              >
                Iniciar Sesión
              </Link>
              <Link 
                to="/onboarding" 
                className="bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200"
              >
                Empezar Ahora
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block py-1 px-3 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold tracking-wide uppercase mb-4">
              Impulsa tu Crecimiento Financiero
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
              La Red que <span className="text-emerald-600">Impulsa</span> <br /> tu Futuro Económico
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              Únete a la plataforma líder en marketing de referidos gamificado. Crece financieramente mientras construyes una red sólida y obtienes recompensas reales.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/onboarding" 
                className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 group"
              >
                Crear Cuenta Gratis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                to="/login" 
                className="w-full sm:w-auto bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-full text-lg font-semibold hover:bg-slate-50 transition-all"
              >
                Iniciar Sesión
              </Link>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-16 relative"
          >
            <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full -z-10 transform -translate-y-1/2"></div>
            <img 
              src="https://picsum.photos/seed/dashboard/1200/600" 
              alt="ImpulsaRed Dashboard" 
              className="rounded-2xl shadow-2xl border border-slate-100 mx-auto"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">¿Por qué elegir ImpulsaRed?</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Diseñamos una experiencia única para que alcances tus metas financieras de forma divertida y colaborativa.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <TrendingUp className="w-6 h-6 text-emerald-600" />,
                title: "Crecimiento Exponencial",
                description: "Aprovecha el poder del interés compuesto y las redes de referidos para multiplicar tus ingresos."
              },
              {
                icon: <Trophy className="w-6 h-6 text-emerald-600" />,
                title: "Gamificación Real",
                description: "Sube de nivel, completa misiones y desbloquea beneficios exclusivos mientras progresas."
              },
              {
                icon: <Users className="w-6 h-6 text-emerald-600" />,
                title: "Comunidad Activa",
                description: "Conecta con mentores y otros usuarios que comparten tu visión de libertad financiera."
              },
              {
                icon: <Shield className="w-6 h-6 text-emerald-600" />,
                title: "Seguridad y Transparencia",
                description: "Tus fondos y datos están protegidos con los más altos estándares de seguridad tecnológica."
              },
              {
                icon: <Zap className="w-6 h-6 text-emerald-600" />,
                title: "Resultados Rápidos",
                description: "Nuestro sistema está optimizado para que veas tus primeros beneficios en tiempo récord."
              },
              {
                icon: <Target className="w-6 h-6 text-emerald-600" />,
                title: "Metas Claras",
                description: "Establece tus objetivos financieros y deja que nuestra plataforma te guíe para alcanzarlos."
              }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100"
              >
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Comienza tu viaje en 3 simples pasos</h2>
              <div className="space-y-8">
                {[
                  {
                    step: "01",
                    title: "Regístrate",
                    description: "Crea tu cuenta en menos de 2 minutos y elige el plan que mejor se adapte a tus necesidades."
                  },
                  {
                    step: "02",
                    title: "Construye tu Red",
                    description: "Invita a tus amigos y conocidos a unirse a ImpulsaRed usando tu enlace personalizado."
                  },
                  {
                    step: "03",
                    title: "Gana y Crece",
                    description: "Recibe comisiones directas e indirectas mientras tu red crece y tú escalas en los niveles."
                  }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-6">
                    <span className="text-4xl font-black text-emerald-100 leading-none">{item.step}</span>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                      <p className="text-slate-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:w-1/2">
              <img 
                src="https://picsum.photos/seed/network/600/600" 
                alt="How it works" 
                className="rounded-3xl shadow-xl"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto bg-slate-900 rounded-3xl p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2"></div>
          
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 relative z-10">¿Listo para transformar tus finanzas?</h2>
          <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto relative z-10">
            Únete a miles de usuarios que ya están construyendo su futuro con ImpulsaRed. No dejes pasar la oportunidad.
          </p>
          <Link 
            to="/onboarding" 
            className="inline-block bg-emerald-500 text-white px-10 py-4 rounded-full text-lg font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 relative z-10"
          >
            Empezar Ahora Gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
                <TrendingUp className="text-white w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-slate-900">ImpulsaRed</span>
            </div>
            <div className="flex gap-8 text-sm text-slate-500">
              <a href="#" className="hover:text-emerald-600 transition-colors">Términos</a>
              <a href="#" className="hover:text-emerald-600 transition-colors">Privacidad</a>
              <a href="#" className="hover:text-emerald-600 transition-colors">Contacto</a>
            </div>
            <p className="text-sm text-slate-400">© 2026 ImpulsaRed. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
