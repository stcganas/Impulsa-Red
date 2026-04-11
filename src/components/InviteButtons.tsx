import React, { useState } from "react";
import { MessageCircle, UserPlus, Copy, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSettings } from "../contexts/SettingsContext";
import { motion } from "motion/react";

interface InviteButtonsProps {
  referralCode: string;
  referrerName: string;
  whatsappMessage?: string;
}

export default function InviteButtons({ referralCode, referrerName, whatsappMessage }: InviteButtonsProps) {
  const [copied, setCopied] = useState(false);
  const { settings } = useSettings();
  const inviteLink = `${window.location.origin}/invite/${referralCode}`;
  const registerLink = `/register?ref=${referralCode}`;

  const appName = settings.app_name || "ImpulsaRed";
  const defaultWhatsappMessage = `🚀 ${referrerName} te invita a ${appName}.\n\nEmpieza a generar ingresos con tu red.\n\nÚnete aquí 👇\n\n${inviteLink}`;
  const finalWhatsappMessage = whatsappMessage || defaultWhatsappMessage;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const trackEvent = async (eventType: string) => {
    try {
      await supabase.from('conversion_events').insert({
        referral_code: referralCode,
        event_type: eventType,
        metadata: { path: window.location.pathname }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleWhatsappShare = () => {
    trackEvent('click_whatsapp');
    const url = `https://wa.me/?text=${encodeURIComponent(finalWhatsappMessage)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="w-full space-y-3">
      <Link
        id="register-button"
        to={registerLink}
        onClick={() => trackEvent('click_register')}
        className="flex items-center justify-center gap-3 w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-95 relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
        <UserPlus className="w-6 h-6 z-10" />
        <span className="z-10">REGISTRARME AHORA</span>
      </Link>

      <button
        id="share-whatsapp"
        onClick={handleWhatsappShare}
        className="flex items-center justify-center gap-3 w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold hover:bg-[#20bd5a] transition-all active:scale-95 shadow-lg shadow-[#25D366]/30"
      >
        <MessageCircle className="w-6 h-6" />
        COMPARTIR POR WHATSAPP
      </button>

      {/* Sticky WhatsApp Button for Mobile */}
      <motion.button
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 1, type: "spring" }}
        onClick={handleWhatsappShare}
        className="md:hidden fixed bottom-6 right-6 z-40 bg-[#25D366] text-white p-4 rounded-full shadow-2xl shadow-[#25D366]/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
      >
        <MessageCircle className="w-8 h-8" />
      </motion.button>

      <button
        onClick={handleCopy}
        className="flex items-center justify-center gap-2 w-full py-3 text-slate-500 font-medium hover:text-slate-800 transition-colors"
      >
        {copied ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ¡Enlace copiado!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Copiar enlace de invitación
          </>
        )}
      </button>
    </div>
  );
}
