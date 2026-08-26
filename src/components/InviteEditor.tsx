import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useUser } from "../contexts/UserContext";
import { useSettings } from "../contexts/SettingsContext";
import { Camera, Image as ImageIcon, Save, Loader2, ExternalLink, Eye, Copy, Check, Sparkles, MessageCircle, Send, CheckCircle2 } from "lucide-react";
import InviteProfileCard from "./InviteProfileCard";
import { motion, AnimatePresence } from "motion/react";

export default function InviteEditor() {
  const { user, refreshUser } = useUser();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formData, setFormData] = useState({
    invite_title: "",
    invite_message: "",
    invite_whatsapp_message: "",
    photo_url: "",
    invite_banner: ""
  });

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        invite_title: user.invite_title || "",
        invite_message: user.invite_message || "",
        invite_whatsapp_message: user.invite_whatsapp_message || "",
        photo_url: user.photo_url || user.avatar_url || "",
        invite_banner: user.invite_banner || ""
      });
    }
  }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'photo_url' | 'invite_banner') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${field}-${Date.now()}.${fileExt}`;
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No session");

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            bucket: 'app-assets',
            fileName,
            base64Data,
            contentType: file.type
          })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Error uploading image');

        setFormData(prev => ({ ...prev, [field]: result.publicUrl }));
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update(formData)
        .eq('id', user.id);

      if (error) throw error;
      await refreshUser();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving invite settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const inviteCode = user?.referral_code || "IMPULSA";
  const inviteLink = `${window.location.origin}/invite/${inviteCode}`;
  const appName = settings.app_name || "ImpulsaRed";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const applyTemplate = (templateType: 'high_earnings' | 'team_leader' | 'daily_tasks') => {
    if (templateType === 'high_earnings') {
      setFormData(prev => ({
        ...prev,
        invite_title: `🚀 Gana comisiones diarias con mi equipo en ${appName}`,
        invite_message: `Únete hoy a mi red y accede a ganancias por niveles y tareas remuneradas exclusivas.`,
        invite_whatsapp_message: `🔥 ¡Hola! Te invito a unirte a mi equipo en ${appName}.\n\n💰 Gana hasta un 70% de comisiones por red y retira tus ganancias de forma segura.`
      }));
    } else if (templateType === 'team_leader') {
      setFormData(prev => ({
        ...prev,
        invite_title: `👑 Conviértete en Líder y multiplica tus ingresos en ${appName}`,
        invite_message: `Buscamos personas comprometidas para construir equipos y liderar redes de alto rendimiento.`,
        invite_whatsapp_message: `👑 Hola, estoy formando un equipo de líderes en ${appName}. Te dejo mi enlace exclusivo con cupo prioritario.`
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        invite_title: `⚡ Tareas diarias pagadas en ${appName}`,
        invite_message: `Completa misiones sencillas todos los días y genera ingresos desde tu celular.`,
        invite_whatsapp_message: `⚡ Hola! En ${appName} puedes ganar dinero completando tareas diarias desde tu teléfono. ¡Únete con mi código de líder!`
      }));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Editor Form */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#111] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Motor de Conversión Viral</h2>
                <p className="text-xs text-slate-400">Personaliza tu página de aterrizaje y mensajes de invitación</p>
              </div>
            </div>
          </div>

          {/* Link Section */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl border border-blue-100 dark:border-blue-800/30 flex items-center justify-between gap-4">
            <div className="flex-1 truncate">
              <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Tu Enlace Viral de Alta Conversión</p>
              <p className="text-sm text-slate-700 dark:text-slate-200 truncate font-mono font-bold">{inviteLink}</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCopyLink}
                className="p-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                title="Copiar enlace"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <a 
                href={inviteLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-xs font-bold"
                title="Abrir página de invitación"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Probar Página</span>
              </a>
            </div>
          </div>

          {/* Quick Viral Templates */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Plantillas Rápidas de Conversión</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => applyTemplate('high_earnings')}
                className="p-2.5 bg-slate-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 transition-colors text-center"
              >
                💰 Ganancias
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('team_leader')}
                className="p-2.5 bg-slate-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 transition-colors text-center"
              >
                👑 Liderazgo
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('daily_tasks')}
                className="p-2.5 bg-slate-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 transition-colors text-center"
              >
                ⚡ Tareas
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Photo & Banner Upload */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Foto de Perfil</label>
                <div className="relative group">
                  <div className="w-full aspect-square rounded-2xl bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden">
                    {formData.photo_url ? (
                      <img src={formData.photo_url} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                      <Camera className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleUpload(e, 'photo_url')}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={loading}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl pointer-events-none">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Banner de Portada</label>
                <div className="relative group">
                  <div className="w-full aspect-square rounded-2xl bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden">
                    {formData.invite_banner ? (
                      <img src={formData.invite_banner} className="w-full h-full object-cover" alt="Banner" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleUpload(e, 'invite_banner')}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={loading}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl pointer-events-none">
                    <ImageIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Text Inputs */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Título de Invitación</label>
                <input 
                  type="text"
                  value={formData.invite_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, invite_title: e.target.value }))}
                  placeholder={`${user?.name || "Líder"} te invita a ${appName} 🚀`}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white text-sm font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Mensaje de Bienvenida</label>
                <textarea 
                  value={formData.invite_message}
                  onChange={(e) => setFormData(prev => ({ ...prev, invite_message: e.target.value }))}
                  placeholder="Gana dinero construyendo tu red y completando misiones diarias con hasta 70% de comisión."
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none dark:text-white text-sm font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Mensaje predeterminado de WhatsApp</label>
                <textarea 
                  value={formData.invite_whatsapp_message}
                  onChange={(e) => setFormData(prev => ({ ...prev, invite_whatsapp_message: e.target.value }))}
                  placeholder={`🚀 Hola! Te invito a unirte a mi equipo en ${appName}...`}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none dark:text-white text-sm font-medium"
                />
                <p className="text-[10px] text-slate-400 mt-1 italic">El enlace de tu landing viral se agregará automáticamente.</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>GUARDAR CAMBIOS DEL MOTOR VIRAL</span>
            </button>

            <AnimatePresence>
              {saveSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold text-center border border-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡Cambios guardados con éxito! Tu página viral ya está actualizada.</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Live Preview Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-slate-400 font-bold text-xs uppercase tracking-widest px-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-500" />
            <span>Previsualización en vivo</span>
          </div>
          <a
            href={inviteLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline flex items-center gap-1 font-bold"
          >
            <span>Ver pantalla completa</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        
        <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-[2.5rem] border-[6px] border-slate-900 shadow-2xl bg-slate-950 text-white p-5 space-y-5">
          {/* Header Banner Preview */}
          <div className="h-28 w-full rounded-2xl bg-slate-900 overflow-hidden relative border border-white/5">
            {formData.invite_banner ? (
              <img src={formData.invite_banner} className="w-full h-full object-cover opacity-80" alt="Preview Banner" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 opacity-80" />
            )}
            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full text-[9px] font-bold text-white">
              {appName}
            </div>
          </div>

          <div className="-mt-10">
            <InviteProfileCard 
              name={user?.name || "Tu Nombre"}
              photoUrl={formData.photo_url}
              title={formData.invite_title}
              message={formData.invite_message}
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
              <span>Código: {inviteCode}</span>
              <span className="text-emerald-400">+100 XP Bono</span>
            </div>
            <div className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black text-center shadow-md">
              REGISTRARME AHORA
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
