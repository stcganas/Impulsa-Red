import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Network, TrendingUp, Target } from "lucide-react";
import { useUser } from "../contexts/UserContext";

const steps = [
  {
    id: 1,
    title: "Convierte tus conexiones en ingresos",
    description: "Únete a la red de crecimiento financiero más innovadora.",
    icon: Network,
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    id: 2,
    title: "Sube de nivel y desbloquea hasta 70%",
    description:
      "Gana comisiones por referidos y aumenta tu porcentaje con cada nivel.",
    icon: TrendingUp,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
  },
  {
    id: 3,
    title: "Tu crecimiento depende de ti",
    description: "Cumple tareas diarias, gana XP y conviértete en un líder.",
    icon: Target,
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const { user, loading } = useUser();

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

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      navigate("/register");
    }
  };

  const handleSkip = () => {
    navigate("/login");
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden relative">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[50%] bg-blue-600/30 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-600/20 blur-[100px] rounded-full" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col items-center text-center w-full max-w-sm"
          >
            <div
              className={`w-40 h-40 rounded-full flex items-center justify-center mb-10 ${step.bg} shadow-2xl shadow-black/50`}
            >
              <Icon className={`w-20 h-20 ${step.color}`} />
            </div>

            <h1 className="text-3xl font-bold mb-4 leading-tight tracking-tight">
              {step.title}
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              {step.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-8 pb-12 relative z-10">
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentStep ? "w-8 bg-blue-500" : "w-2 bg-slate-700"
              }`}
            />
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all active:scale-[0.98]"
          >
            {currentStep === steps.length - 1 ? "Crear cuenta" : "Comenzar"}
          </button>

          {currentStep === steps.length - 1 ? (
            <button
              onClick={handleSkip}
              className="w-full py-4 rounded-2xl bg-white/10 text-white font-semibold text-lg hover:bg-white/20 transition-all active:scale-[0.98]"
            >
              Iniciar sesión
            </button>
          ) : (
            <button
              onClick={handleSkip}
              className="w-full py-4 text-slate-400 font-medium text-lg hover:text-white transition-colors"
            >
              Saltar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
