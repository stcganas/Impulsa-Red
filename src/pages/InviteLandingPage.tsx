import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CheckCircle, Users, Trophy, Zap, Loader2, MessageCircle } from "lucide-react";
import InviteProfileCard from "../components/InviteProfileCard";
import InviteButtons from "../components/InviteButtons";
import { motion } from "motion/react";
import SocialProofFeed from "../components/viral/SocialProofFeed";
import UrgencyBanner from "../components/viral/UrgencyBanner";
import RewardPreview from "../components/viral/RewardPreview";
import ReferralProgressBar from "../components/viral/ReferralProgressBar";
import ExitIntentModal from "../components/viral/ExitIntentModal";
import FloatingNotifications from "../components/viral/FloatingNotifications";
import { useSettings } from "../contexts/SettingsContext";

interface ReferrerInfo {
  name: string;
  photo_url?: string;
  invite_title?: string;
  invite_message?: string;
  invite_banner?: string;
  invite_whatsapp_message?: string;
  referral_code: string;
}

export default function InviteLandingPage() {
  const { referralCode } = useParams<{ referralCode: string }>();
  const [referrer, setReferrer] = useState<ReferrerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinedCount, setJoinedCount] = useState(0);
  const [dailyJoins, setDailyJoins] = useState(0);
  const { settings } = useSettings();
  const [isFromWhatsapp, setIsFromWhatsapp] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    // Check personalization
    if (document.referrer.includes('whatsapp') || window.location.search.includes('source=whatsapp')) {
      setIsFromWhatsapp(true);
    }
    if (localStorage.getItem(`visited_${referralCode}`)) {
      setIsReturning(true);
    }
    localStorage.setItem(`visited_${referralCode}`, 'true');

    const fetchReferrer = async () => {
      if (!referralCode) return;

      try {
        // Track click
        fetch('/api/referrals/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referralCode })
        }).catch(err => console.error("Error tracking click:", err));

        // Track page view
        const trackView = async () => {
          try {
            await supabase.from('conversion_events').insert({
              referral_code: referralCode,
              event_type: 'page_view',
              metadata: { 
                referrer: document.referrer,
                userAgent: navigator.userAgent
              }
            });
          } catch (err) {
            console.error("Error tracking page view:", err);
          }
        };
        trackView();

        // Fetch referrer info
        const { data, error } = await supabase
          .from('users')
          .select('name, photo_url, invite_title, invite_message, invite_banner, invite_whatsapp_message, referral_code, id')
          .eq('referral_code', referralCode)
          .single();

        if (error) throw error;
        setReferrer(data);

        // Fetch joined count (total referrals for this user)
        const { count } = await supabase
          .from('referrals')
          .select('*', { count: 'exact', head: true })
          .eq('referrer_id', data.id);
        
        setJoinedCount(count || 0);

        // Fetch daily joins
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const { count: dailyCount } = await supabase
          .from('referrals')
          .select('*', { count: 'exact', head: true })
          .eq('referrer_id', data.id)
          .gte('created_at', yesterday.toISOString());
          
        setDailyJoins(dailyCount || 0);

      } catch (err) {
        console.error("Error fetching referrer:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReferrer();
  }, [referralCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!referrer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Enlace no válido</h1>
        <p className="text-slate-600 mb-6">El código de invitación no existe o ha expirado.</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold"
        >
          Ir al inicio
        </button>
      </div>
    );
  }

  const benefits = [
    { icon: <Zap className="w-5 h-5 text-amber-500" />, text: "Gana comisiones por tu red" },
    { icon: <Trophy className="w-5 h-5 text-blue-500" />, text: "Completa misiones y sube de nivel" },
    { icon: <Users className="w-5 h-5 text-emerald-500" />, text: "Conviértete en líder de equipo" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      <SocialProofFeed referralCode={referralCode || ''} />
      <FloatingNotifications />
      <ExitIntentModal referralCode={referralCode || ''} />
      
      <UrgencyBanner 
        active={settings.bonus_active === true || settings.bonus_active === 'true'} 
        multiplier={Number(settings.bonus_multiplier) || 2} 
        expiration={settings.bonus_expiration || new Date(Date.now() + 86400000).toISOString()} 
      />

      {/* Banner */}
      <div className="h-48 w-full bg-slate-200 relative overflow-hidden">
        {referrer.invite_banner ? (
          <img 
            src={referrer.invite_banner} 
            alt="Banner" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 opacity-80" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 -mt-16 px-6 pb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-8 space-y-8"
        >
          <InviteProfileCard 
            name={referrer.name}
            photoUrl={referrer.photo_url}
            title={referrer.invite_title}
            message={referrer.invite_message}
          />

          {isReturning && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-blue-50 text-blue-700 p-3 rounded-xl text-sm font-medium text-center border border-blue-100">
              👀 ¡Bienvenido de nuevo! Tu invitación sigue activa.
            </motion.div>
          )}

          {isFromWhatsapp && !isReturning && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-sm font-medium text-center border border-emerald-100 flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> Viniste desde WhatsApp 📲 Aprovecha la oportunidad.
            </motion.div>
          )}

          <ReferralProgressBar current={joinedCount} goal={Math.ceil((joinedCount + 1) / 10) * 10} />

          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                <Users className="w-4 h-4" />
                <span>{joinedCount + 124} personas ya se unieron</span>
              </div>
              <div className="flex items-center gap-2 text-amber-600 text-sm font-bold bg-amber-50 px-3 py-1 rounded-full">
                🔥 {dailyJoins + 12} personas se han unido hoy
              </div>
            </div>

            <div className="space-y-3 py-4 border-y border-slate-50">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                    {benefit.icon}
                  </div>
                  <span className="text-slate-700 font-medium text-sm">{benefit.text}</span>
                </div>
              ))}
            </div>
          </div>

          <RewardPreview />

          <InviteButtons 
            referralCode={referrer.referral_code}
            referrerName={referrer.name}
            whatsappMessage={referrer.invite_whatsapp_message}
          />
        </motion.div>

        <div className="mt-12 text-center">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{settings.app_name || "ImpulsaRed"} © 2026</p>
        </div>
      </div>
    </div>
  );
}
