import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2, Users, Trophy, Zap, Loader2, MessageCircle, Gift, ShieldCheck, ArrowRight, Star, Sparkles, Copy, Check } from "lucide-react";
import InviteProfileCard from "../components/InviteProfileCard";
import InviteButtons from "../components/InviteButtons";
import { motion, AnimatePresence } from "motion/react";
import SocialProofFeed from "../components/viral/SocialProofFeed";
import UrgencyBanner from "../components/viral/UrgencyBanner";
import RewardPreview from "../components/viral/RewardPreview";
import ReferralProgressBar from "../components/viral/ReferralProgressBar";
import ExitIntentModal from "../components/viral/ExitIntentModal";
import FloatingNotifications from "../components/viral/FloatingNotifications";
import { useSettings } from "../contexts/SettingsContext";

interface ReferrerInfo {
  id?: string;
  name: string;
  photo_url?: string;
  invite_title?: string;
  invite_message?: string;
  invite_banner?: string;
  invite_whatsapp_message?: string;
  referral_code: string;
  level?: number;
  plan?: string;
}

export default function InviteLandingPage() {
  const { referralCode } = useParams<{ referralCode: string }>();
  const navigate = useNavigate();
  const cleanCode = (referralCode || "").trim().toUpperCase();

  const [referrer, setReferrer] = useState<ReferrerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinedCount, setJoinedCount] = useState(14);
  const [dailyJoins, setDailyJoins] = useState(3);
  const { settings } = useSettings();
  const [isFromWhatsapp, setIsFromWhatsapp] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!cleanCode) {
      setLoading(false);
      return;
    }

    // Persist referral code for the registration page
    localStorage.setItem("referral_code", cleanCode);
    sessionStorage.setItem("referral_code", cleanCode);

    // Detect visitor source
    if (document.referrer.includes("whatsapp") || window.location.search.includes("source=whatsapp")) {
      setIsFromWhatsapp(true);
    }
    if (localStorage.getItem(`visited_${cleanCode}`)) {
      setIsReturning(true);
    }
    localStorage.setItem(`visited_${cleanCode}`, "true");

    // Track click & page view asynchronously via server
    fetch("/api/referrals/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralCode: cleanCode })
    }).catch(() => {});

    fetch("/api/referrals/track-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referralCode: cleanCode,
        eventType: "page_view",
        metadata: { referrer: document.referrer, source: isFromWhatsapp ? "whatsapp" : "direct" }
      })
    }).catch(() => {});

    // Fetch referrer details from backend
    const loadReferrerInfo = async () => {
      try {
        const response = await fetch(`/api/referrals/info/${encodeURIComponent(cleanCode)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.referrer) {
            setReferrer(data.referrer);
            if (typeof data.joinedCount === "number") setJoinedCount(data.joinedCount);
            if (typeof data.dailyJoins === "number") setDailyJoins(data.dailyJoins);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Could not load from API, applying fallback:", err);
      }

      // Safe fallback if network error
      setReferrer({
        id: "system",
        name: "Líder de la Comunidad",
        photo_url: "",
        invite_title: `¡Te invitan a unirte a ${settings.app_name || "ImpulsaRed"}! 🚀`,
        invite_message: "Comienza a generar ingresos diarios con tareas y expande tu red de afiliados con hasta 70% de comisión.",
        invite_banner: "",
        invite_whatsapp_message: `🚀 Hola, te invito a unirte a mi equipo en ${settings.app_name || "ImpulsaRed"}. ¡Empieza a generar dinero hoy!`,
        referral_code: cleanCode,
        level: 5,
        plan: "Pro"
      });
      setLoading(false);
    };

    loadReferrerInfo();
  }, [cleanCode, settings.app_name, isFromWhatsapp]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(cleanCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-300">Cargando invitación exclusiva...</p>
      </div>
    );
  }

  const appName = (settings?.app_name || "ImpulsaRed").replace(/^"|"$/g, "");
  const displayName = (referrer?.name || "").trim() || "Líder de la Red";
  const displayTitle = (referrer?.invite_title || "").trim() || `${displayName} te invita a unirte a ${appName} 🚀`;
  const displayMessage = (referrer?.invite_message || "").trim() || "Comienza a generar ingresos diarios con tareas y expande tu red de afiliados con hasta 70% de comisión.";
  const displayWhatsapp = (referrer?.invite_whatsapp_message || "").trim() || `🚀 ¡Hola! ${displayName} te invita a unirte a ${appName}.\n\n💰 Gana hasta 70% de comisiones por red y completa tareas diarias para ganar saldo real.`;
  const displayPhoto = (referrer?.photo_url || "").trim();
  const displayBanner = (referrer?.invite_banner || "").trim();

  const displayReferrer = {
    id: referrer?.id || "system",
    name: displayName,
    photo_url: displayPhoto,
    invite_title: displayTitle,
    invite_message: displayMessage,
    invite_banner: displayBanner,
    invite_whatsapp_message: displayWhatsapp,
    referral_code: cleanCode || referrer?.referral_code || "IMPULSA",
    level: referrer?.level || 1,
    plan: referrer?.plan || "Básico"
  };

  const benefits = [
    {
      icon: <Zap className="w-5 h-5 text-amber-500" />,
      title: "Comisiones por Red",
      desc: "Gana hasta el 70% en comisiones multinivel (3 niveles de profundidad)."
    },
    {
      icon: <Trophy className="w-5 h-5 text-blue-500" />,
      title: "Misiones y Tareas Diarias",
      desc: "Completa tareas sencillas todos los días para ganar XP y saldo retirable."
    },
    {
      icon: <Gift className="w-5 h-5 text-emerald-500" />,
      title: "Bono de Bienvenida Exclusivo",
      desc: "+100 XP inmediatos al registrarte con este enlace de líder."
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-purple-500" />,
      title: "Retiros Rápidos y Seguros",
      desc: "Pagos garantizados directamente a tu cuenta registrada."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Live Social Proof Floating Feeds */}
      <SocialProofFeed referralCode={cleanCode} />
      <FloatingNotifications />
      <ExitIntentModal referralCode={cleanCode} />

      {/* Urgency Announcement Bar */}
      <UrgencyBanner
        active={settings.bonus_active === true || settings.bonus_active === "true"}
        multiplier={Number(settings.bonus_multiplier) || 2}
        expiration={settings.bonus_expiration || new Date(Date.now() + 86400000).toISOString()}
      />

      {/* Top Hero Banner */}
      <div className="relative h-56 md:h-72 w-full bg-slate-900 overflow-hidden">
        {displayReferrer.invite_banner ? (
          <img
            src={displayReferrer.invite_banner}
            alt="Banner de Invitación"
            className="w-full h-full object-cover opacity-70"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 opacity-90 relative">
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] opacity-20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

        {/* Floating Brand Badge */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-bold text-white shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>{appName} VIP</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 -mt-24 px-4 sm:px-6 pb-16 z-20 max-w-xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl p-6 sm:p-8 space-y-7"
        >
          {/* Referrer Profile Card */}
          <InviteProfileCard
            name={displayReferrer.name}
            photoUrl={displayReferrer.photo_url}
            title={displayReferrer.invite_title}
            message={displayReferrer.invite_message}
          />

          {/* Contextual Badges */}
          {isReturning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-blue-500/10 text-blue-300 p-3.5 rounded-2xl text-xs font-semibold text-center border border-blue-500/20 flex items-center justify-center gap-2"
            >
              <span>👀 ¡Bienvenido de vuelta! Tu cupo con código <strong className="text-white font-mono">{cleanCode}</strong> sigue reservado.</span>
            </motion.div>
          )}

          {isFromWhatsapp && !isReturning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-500/10 text-emerald-300 p-3.5 rounded-2xl text-xs font-semibold text-center border border-emerald-500/20 flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Invitación recibida por WhatsApp 📲 Tienes prioridad de acceso.</span>
            </motion.div>
          )}

          {/* Referral Code Quick Pill */}
          <div className="bg-slate-800/80 rounded-2xl p-3.5 border border-white/5 flex items-center justify-between gap-3">
            <div className="truncate">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Código de Invitación Activo</p>
              <p className="text-base font-mono font-black text-blue-400 tracking-wider truncate">{cleanCode}</p>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 rounded-xl border border-white/10 transition-colors flex items-center gap-1.5 shrink-0"
              title="Copiar código"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedCode ? "Copiado" : "Copiar"}</span>
            </button>
          </div>

          {/* Team Progress Bar */}
          <ReferralProgressBar current={joinedCount} goal={Math.max(10, Math.ceil((joinedCount + 1) / 10) * 10)} />

          {/* Social Proof Counter */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span><strong>{joinedCount + 128}</strong> personas en este equipo</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>+{dailyJoins + 8} registrados hoy</span>
            </div>
          </div>

          {/* Reward Preview */}
          <RewardPreview />

          {/* Benefits List */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">¿Qué obtendrás al unirte?</h3>
            <div className="grid grid-cols-1 gap-2.5">
              {benefits.map((b, idx) => (
                <div key={idx} className="flex items-start gap-3.5 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 border border-white/5">
                    {b.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-snug">{b.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Conversion Buttons */}
          <div className="pt-2">
            <InviteButtons
              referralCode={cleanCode}
              referrerName={displayReferrer.name}
              whatsappMessage={displayReferrer.invite_whatsapp_message}
            />
          </div>
        </motion.div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">{appName} • Ecosistema de Afiliados y Tareas</p>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
            <Link to={`/register?ref=${cleanCode}`} className="hover:text-white transition-colors">Crear Cuenta</Link>
            <span>•</span>
            <Link to="/login" className="hover:text-white transition-colors">Iniciar Sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
