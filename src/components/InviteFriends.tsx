import React, { useState } from "react";
import { Copy, Share2, MessageCircle, CheckCircle2, Rocket, ChevronRight, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useFeatures } from "../contexts/FeatureContext";
import { useSettings } from "../contexts/SettingsContext";
import { cn } from "@/lib/utils";

import { TaskEngine } from "../utils/TaskEngine";

interface InviteFriendsProps {
  referralCode: string;
  onSwitchToViral?: () => void;
  referralCount?: number;
}

export default function InviteFriends({ referralCode, onSwitchToViral, referralCount = 0 }: InviteFriendsProps) {
  const [copied, setCopied] = useState(false);
  const { getUserFeature } = useFeatures();
  const { settings } = useSettings();
  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;

  const maxReferrals = getUserFeature('max_referrals');
  const hasReachedLimit = maxReferrals !== null && maxReferrals !== undefined && referralCount >= maxReferrals;

  const copyToClipboard = async () => {
    if (hasReachedLimit) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    await TaskEngine.triggerEvent('SHARE_COMPLETED', 1);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = async () => {
    if (hasReachedLimit) return;
    const appName = settings.app_name || "ImpulsaRed";
    const message = `Únete a ${appName} y comienza a generar ingresos conmigo 🚀 ${referralLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    await TaskEngine.triggerEvent('SHARE_COMPLETED', 1);
    window.open(url, "_blank");
  };

  const shareGeneric = async () => {
    if (hasReachedLimit) return;
    const appName = settings.app_name || "ImpulsaRed";
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Únete a ${appName}`,
          text: `Comienza a generar ingresos conmigo en ${appName} 🚀`,
          url: referralLink,
        });
        await TaskEngine.triggerEvent('SHARE_COMPLETED', 1);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="bg-white dark:bg-[#111] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-white/5">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center">
          <Share2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Invitar amigos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-balance">Gana XP y comisiones por cada amigo que se una.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Limit Warning */}
        {hasReachedLimit && (
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Límite de referidos alcanzado</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Tu plan actual permite un máximo de {maxReferrals} referidos. Mejora tu plan para invitar a más personas.
              </p>
            </div>
          </div>
        )}

        {/* Viral Engine Banner */}
        {onSwitchToViral && (
          <motion.div 
            whileHover={!hasReachedLimit ? { scale: 1.02 } : {}}
            whileTap={!hasReachedLimit ? { scale: 0.98 } : {}}
            onClick={!hasReachedLimit ? onSwitchToViral : undefined}
            className={cn(
              "rounded-2xl p-4 text-white shadow-lg flex items-center justify-between relative overflow-hidden transition-all",
              hasReachedLimit 
                ? "bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-50" 
                : "bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-violet-500/20 cursor-pointer"
            )}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-violet-200 text-[10px] font-bold uppercase tracking-widest mb-0.5">
                  Nuevo
                </p>
                <p className="font-bold text-sm">Motor de Conversión Viral</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70 relative z-10" />
          </motion.div>
        )}

        {/* Referral Code Box */}
        <div className={cn(
          "bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-dashed transition-all",
          hasReachedLimit ? "border-slate-300 dark:border-white/5 opacity-50" : "border-slate-200 dark:border-white/10"
        )}>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Tu código de invitación</p>
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-2xl font-mono font-bold tracking-widest transition-all",
              hasReachedLimit ? "text-slate-400" : "text-blue-600 dark:text-blue-400"
            )}>{referralCode}</span>
            <button 
              onClick={copyToClipboard}
              disabled={hasReachedLimit}
              className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:cursor-not-allowed"
            >
              {copied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Referral Link Box */}
        <div className={hasReachedLimit ? "opacity-50" : ""}>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Tu enlace personal</p>
          <div className="flex gap-2">
            <div className="flex-1 bg-slate-50 dark:bg-white/5 rounded-xl px-4 py-3 text-sm text-slate-600 dark:text-slate-300 truncate border border-slate-100 dark:border-white/10">
              {referralLink}
            </div>
            <button 
              onClick={copyToClipboard}
              disabled={hasReachedLimit}
              className="px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:cursor-not-allowed"
            >
              <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={shareWhatsApp}
            disabled={hasReachedLimit}
            className={cn(
              "flex items-center justify-center gap-2 py-3 text-white rounded-2xl font-semibold transition-all shadow-lg",
              hasReachedLimit 
                ? "bg-slate-400 dark:bg-slate-700 cursor-not-allowed shadow-none" 
                : "bg-[#25D366] hover:opacity-90 shadow-[#25D366]/20"
            )}
          >
            <MessageCircle className="w-5 h-5" />
            WhatsApp
          </button>
          <button 
            onClick={shareGeneric}
            disabled={hasReachedLimit}
            className={cn(
              "flex items-center justify-center gap-2 py-3 text-white rounded-2xl font-semibold transition-all shadow-lg",
              hasReachedLimit 
                ? "bg-slate-400 dark:bg-slate-700 cursor-not-allowed shadow-none" 
                : "bg-slate-900 hover:bg-slate-800 shadow-slate-900/20"
            )}
          >
            <Share2 className="w-5 h-5" />
            Compartir
          </button>
        </div>
      </div>

      <AnimatePresence>
        {copied && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-medium shadow-xl z-50"
          >
            ¡Enlace copiado al portapapeles!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
