import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Crown, ArrowRight, X, Upload, Loader2, DollarSign, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";
import { supabase } from "../lib/supabase";

const plans = [
  {
    id: "basic",
    name: "Básico",
    price: "$15.000",
    numericPrice: 15000,
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
    numericPrice: 30000,
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
    numericPrice: 60000,
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
    numericPrice: 120000,
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
  const { user, refreshUser } = useUser();
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectPlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    if (!user?.id) {
      navigate("/login");
      return;
    }

    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen del comprobante.');
      return;
    }

    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setReceiptPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPurchase = async () => {
    if (!selectedPlan || !receiptFile) return;

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      // 1. Upload receipt
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      // 2. Call API
      const response = await fetch('/api/plans/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          planId: selectedPlan.id,
          receiptUrl: publicUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al procesar la compra");
      }

      alert("¡Comprobante enviado con éxito! Un administrador revisará tu pago pronto.");
      setIsModalOpen(false);
      navigate("/dashboard");
    } catch (error) {
      console.error("Error updating plan:", error);
      alert(error instanceof Error ? error.message : "Error al procesar la compra");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Payment Modal */}
      {isModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl relative overflow-hidden"
          >
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", selectedPlan.color)}>
                <CreditCard className={cn("w-8 h-8", selectedPlan.textColor)} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Pagar Plan {selectedPlan.name}</h3>
                <p className="text-slate-500 font-medium">Monto a transferir: <span className="text-slate-900 font-bold">{selectedPlan.price} COP</span></p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Datos de Transferencia</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Banco:</span>
                  <span className="text-slate-900 font-bold">Bancolombia</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Tipo de cuenta:</span>
                  <span className="text-slate-900 font-bold">Ahorros</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Número:</span>
                  <span className="text-slate-900 font-bold">123-456789-01</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Titular:</span>
                  <span className="text-slate-900 font-bold">ImpulsaRed S.A.S</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-700">Sube tu comprobante de pago:</p>
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />

              {!receiptPreview ? (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
                  </div>
                  <span className="text-sm font-bold text-slate-500 group-hover:text-blue-600">Haz clic para subir imagen</span>
                </button>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                  <img src={receiptPreview} alt="Receipt Preview" className="w-full h-full object-contain" />
                  <button 
                    onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button
                onClick={handleSubmitPurchase}
                disabled={!receiptFile || uploading}
                className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-lg shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Enviar Comprobante</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
