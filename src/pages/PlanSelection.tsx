import { useNavigate } from "react-router-dom";
import { Check, Crown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";

const plans = [
  {
    id: "basic",
    name: "Básico",
    price: "$15.000",
    baseCommission: "5%",
    increment: "0.65%",
    features: [
      "Acceso a tareas diarias",
      "Soporte estándar",
      "Material de marketing básico",
    ],
    color: "bg-slate-100",
    textColor: "text-slate-800",
    buttonColor: "bg-slate-800 text-white hover:bg-slate-700",
  },
  {
    id: "advanced",
    name: "Avanzado",
    price: "$30.000",
    baseCommission: "10%",
    increment: "0.60%",
    features: [
      "Todo lo del plan Básico",
      "Soporte prioritario",
      "Capacitaciones exclusivas",
    ],
    color: "bg-blue-50",
    textColor: "text-blue-900",
    buttonColor: "bg-blue-600 text-white hover:bg-blue-700",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$60.000",
    baseCommission: "20%",
    increment: "0.50%",
    features: [
      "Todo lo del plan Avanzado",
      "Mentorías grupales",
      "Herramientas de automatización",
    ],
    color: "bg-emerald-50",
    textColor: "text-emerald-900",
    buttonColor: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  {
    id: "elite",
    name: "Élite",
    price: "$120.000",
    baseCommission: "30%",
    increment: "0.40%",
    features: [
      "Todo lo del plan Pro",
      "Mentoría 1 a 1",
      "Eventos VIP presenciales",
      "Máxima rentabilidad",
    ],
    color: "bg-gradient-to-br from-amber-100 to-amber-200",
    textColor: "text-amber-900",
    buttonColor:
      "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50",
    isPremium: true,
  },
];

export default function PlanSelection() {
  const navigate = useNavigate();

  const { refreshUser } = useUser();

  const handleSelectPlan = async (planId: string) => {
    const selectedPlan = plans.find(p => p.id === planId);
    if (!selectedPlan) return;

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      // Extract numeric price from "$15.000"
      const numericPrice = parseInt(selectedPlan.price.replace('$', '').replace('.', ''));

      const response = await fetch("/api/user/purchase-plan", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          plan: selectedPlan.name,
          amount: numericPrice,
          percentage: parseFloat(selectedPlan.baseCommission.replace('%', ''))
        }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("user", JSON.stringify(data.user));
        await refreshUser();
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error updating plan:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="bg-slate-900 text-white pt-16 pb-24 px-6 rounded-b-[40px] shadow-xl relative overflow-hidden">
        <div className="absolute top-[-50%] right-[-20%] w-[80%] h-[150%] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-3 tracking-tight">
            Elige tu plan
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Selecciona el punto de partida para tu crecimiento financiero. Todos
            los planes llegan al 70% en el Nivel 100.
          </p>
        </div>
      </div>

      <div className="px-6 -mt-16 space-y-6 relative z-20">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "rounded-3xl p-6 shadow-xl transition-transform active:scale-[0.98]",
              plan.color,
              plan.isPremium
                ? "border-2 border-amber-300 shadow-amber-500/20"
                : "border border-white/50 shadow-slate-200/50",
            )}
          >
            {plan.isPremium && (
              <div className="flex items-center gap-2 text-amber-700 font-bold text-sm uppercase tracking-wider mb-4">
                <Crown className="w-5 h-5" />
                <span>Recomendado</span>
              </div>
            )}

            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className={cn("text-2xl font-bold mb-1", plan.textColor)}>
                  {plan.name}
                </h2>
                <div className="text-3xl font-black tracking-tight">
                  {plan.price}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Comisión Base
                </div>
                <div className={cn("text-3xl font-black", plan.textColor)}>
                  {plan.baseCommission}
                </div>
              </div>
            </div>

            <div className="bg-white/60 rounded-2xl p-4 mb-6 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600 font-medium text-sm">
                  Incremento por nivel
                </span>
                <span className="font-bold text-slate-900">
                  +{plan.increment}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mb-1 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    plan.isPremium ? "bg-amber-500" : "bg-blue-500",
                  )}
                  style={{ width: plan.baseCommission }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>Nivel 1: {plan.baseCommission}</span>
                <span>Nivel 100: 70%</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 rounded-full p-0.5",
                      plan.isPremium
                        ? "bg-amber-200 text-amber-700"
                        : "bg-white text-blue-600",
                    )}
                  >
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-slate-700 font-medium leading-tight">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelectPlan(plan.id)}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2",
                plan.buttonColor,
              )}
            >
              <span>Elegir {plan.name}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
