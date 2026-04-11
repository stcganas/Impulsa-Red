import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useUser } from "../contexts/UserContext";
import { useSettings } from "../contexts/SettingsContext";
import { Camera, Image as ImageIcon, Save, Loader2, ExternalLink, Eye, Copy, Check } from "lucide-react";
import InviteProfileCard from "./InviteProfileCard";
import { motion } from "motion/react";

export default function InviteEditor() {
  const { user, refreshUser } = useUser();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
        const fileName = `${user.id}/${field}-${Math.random()}.${fileExt}`;
        
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
      alert('Error al subir la imagen');
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
      alert('Página de invitación actualizada correctamente');
    } catch (error) {
      console.error('Error saving invite settings:', error);
      alert('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const inviteLink = `${window.location.origin}/invite/${user?.referral_code}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Editor Form */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#111] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Motor de Conversión Viral</h2>
          </div>

          {/* Link Section */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/30 flex items-center justify-between gap-4">
            <div className="flex-1 truncate">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Tu Enlace Viral</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 truncate font-mono">{inviteLink}</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCopyLink}
                className="p-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                title="Copiar enlace"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
              </button>
              <a 
                href={inviteLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition-colors"
                title="Ver página"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
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
                  placeholder={`${user?.name} te invita a ${settings.app_name || "ImpulsaRed"} 🚀`}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Mensaje de Invitación</label>
                <textarea 
                  value={formData.invite_message}
                  onChange={(e) => setFormData(prev => ({ ...prev, invite_message: e.target.value }))}
                  placeholder="Gana dinero construyendo tu red y completando misiones diarias."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Mensaje de WhatsApp</label>
                <textarea 
                  value={formData.invite_whatsapp_message}
                  onChange={(e) => setFormData(prev => ({ ...prev, invite_whatsapp_message: e.target.value }))}
                  placeholder="🚀 Hola! Te invito a unirte a mi equipo..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1 italic">El enlace se añadirá automáticamente al final.</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            GUARDAR CAMBIOS
          </button>
        </div>
      </div>

      {/* Preview Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-slate-400 font-bold text-sm uppercase tracking-widest px-2">
          <Eye className="w-4 h-4" />
          Previsualización en vivo
        </div>
        
        <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-[3rem] border-[8px] border-slate-900 shadow-2xl aspect-[9/19] bg-slate-50 scale-90 origin-top">
          {/* Mock Mobile UI */}
          <div className="absolute top-0 inset-x-0 h-6 bg-slate-900 flex items-center justify-center">
            <div className="w-20 h-4 bg-slate-800 rounded-full" />
          </div>
          
          <div className="h-full overflow-y-auto pt-6 pb-12">
            {/* Banner */}
            <div className="h-32 w-full bg-slate-200 relative overflow-hidden">
              {formData.invite_banner ? (
                <img src={formData.invite_banner} className="w-full h-full object-cover" alt="Preview Banner" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 opacity-80" />
              )}
            </div>

            <div className="px-4 -mt-10">
              <div className="bg-white rounded-[2rem] shadow-xl p-6 space-y-6">
                <InviteProfileCard 
                  name={user?.name || "Usuario"}
                  photoUrl={formData.photo_url}
                  title={formData.invite_title}
                  message={formData.invite_message}
                />
                
                <div className="space-y-4 opacity-50 pointer-events-none">
                  <div className="h-10 bg-slate-100 rounded-xl" />
                  <div className="h-10 bg-slate-100 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
