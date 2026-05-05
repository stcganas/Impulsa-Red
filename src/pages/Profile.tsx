import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Settings,
  BookOpen,
  Crown,
  ChevronRight,
  LogOut,
  ShieldCheck,
  Shield,
  Wallet,
  Sparkles,
  Edit2,
  X,
  Phone,
  MapPin,
  Loader2,
  Moon,
  Sun,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";
import { useTheme } from "../contexts/ThemeContext";
import { supabase } from "../lib/supabase";

import { TaskEngine } from "../utils/TaskEngine";

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useUser();
  const { theme, toggleTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || ""
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast.success("Contraseña actualizada con éxito");
      setIsChangingPassword(false);
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Error al cambiar contraseña");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar los 2MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No session");

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            bucket: 'avatars',
            fileName,
            base64Data,
            contentType: file.type
          })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Error uploading image');

        const { error: updateError } = await supabase
          .from('users')
          .update({ avatar_url: result.publicUrl })
          .eq('id', user.id);

        if (updateError) throw updateError;

        await refreshUser();
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Error al subir la foto de perfil");
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name,
          phone: formData.phone,
          address: formData.address
        })
        .eq('id', user.id);

      if (error) throw error;
      
      // Trigger PROFILE_COMPLETED event if both phone and address are filled
      if (formData.phone && formData.address) {
        await TaskEngine.triggerEvent('PROFILE_COMPLETED', 1, {
          phone: formData.phone,
          address: formData.address
        });
      }

      await refreshUser();
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error al actualizar el perfil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-24 relative overflow-hidden transition-colors duration-300">
      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#111] rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Editar Perfil</h3>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 dark:text-white"
                      placeholder="Tu nombre completo"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 dark:text-white"
                      placeholder="+57 300 000 0000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Dirección</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600" />
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 dark:text-white"
                      placeholder="Ciudad, País"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Cambios"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isChangingPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#111] rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Cambiar Contraseña</h3>
                <button 
                  onClick={() => setIsChangingPassword(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nueva Contraseña</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 dark:text-white"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Confirmar Contraseña</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 dark:text-white"
                    placeholder="Repite la contraseña"
                    minLength={6}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-4 rounded-xl bg-slate-900 dark:bg-blue-600 text-white font-bold shadow-lg shadow-slate-200 dark:shadow-blue-500/20 hover:bg-slate-800 dark:hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Actualizar Contraseña"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-slate-900 dark:bg-[#111] text-white pt-12 pb-32 px-6 rounded-b-[40px] shadow-xl relative transition-colors duration-300">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-blue-600/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            {user.role === 'admin' && (
              <button 
                onClick={() => navigate("/admin")}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                title="Volver al Dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            )}
            <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
          </div>
          <button 
            onClick={() => setIsEditing(true)}
            className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <Edit2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="px-6 -mt-24 relative z-20 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#111] rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-slate-100 dark:border-white/5 text-center"
        >
          <div className="relative inline-block mb-4">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarUpload} 
              className="hidden" 
              accept="image/*" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative group cursor-pointer"
            >
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.name} 
                  className="w-24 h-24 rounded-full border-4 border-white dark:border-[#111] shadow-lg object-cover group-hover:opacity-75 transition-opacity"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-500/10 border-4 border-white dark:border-[#111] shadow-lg flex items-center justify-center text-blue-600 dark:text-blue-400 text-3xl font-black group-hover:bg-blue-200 dark:group-hover:bg-blue-500/20 transition-colors">
                  {user.name.charAt(0)}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingAvatar ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Edit2 className="w-8 h-8 text-white drop-shadow-md" />
                )}
              </div>
            </button>
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 rounded-full border-2 border-white dark:border-[#111] flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {user.name}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">{user.email}</p>
          
          {(user.phone || user.address) && (
            <div className="flex flex-col items-center gap-1 mb-6 text-sm text-slate-400 dark:text-slate-500">
              {user.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {user.phone}</span>}
              {user.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {user.address}</span>}
            </div>
          )}
          {!user.phone && !user.address && <div className="mb-6" />}

          <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-white/5 rounded-2xl p-4 mb-6">
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Plan
              </p>
              <p className="font-black text-slate-900 dark:text-white">{user.plan}</p>
            </div>
            <div className="border-x border-slate-200 dark:border-white/10">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Nivel
              </p>
              <p className="font-black text-slate-900 dark:text-white">{user.level}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Comisión
              </p>
              <p className="font-black text-emerald-600 dark:text-emerald-400">
                {user.percentage}%
              </p>
            </div>
          </div>

          {user.role !== 'admin' && user.plan !== 'Élite' && (
            <button 
              onClick={() => navigate("/plan-selection")}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-lg shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Crown className="w-5 h-5" />
              <span>Mejorar Plan</span>
            </button>
          )}
        </motion.div>
      </div>

      {/* Stats & Links */}
      <div className="px-6 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[#111] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-white/5 flex justify-between items-center"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Total Generado
            </p>
            <p className="font-black text-2xl text-slate-900 dark:text-white">
              ${(user.totalEarned || 0).toLocaleString("es-CO")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Código
            </p>
            <p className="font-bold text-slate-700 dark:text-slate-300">{user.referral_code}</p>
          </div>
        </motion.div>

        <div className="bg-white dark:bg-[#111] rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-white/5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Preferencias</h3>
            <button 
              onClick={toggleTheme}
              className="w-full flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-colors">
                  {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <div className="text-left">
                  <span className="font-bold text-slate-800 dark:text-white block">Modo {theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
                  <span className="text-[10px] text-slate-500">Cambiar apariencia de la app</span>
                </div>
              </div>
              <div className={cn(
                "w-12 h-6 rounded-full relative transition-colors duration-300",
                theme === 'dark' ? "bg-blue-600" : "bg-slate-200"
              )}>
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300",
                  theme === 'dark' ? "left-7" : "left-1"
                )} />
              </div>
            </button>
          </div>

          <button 
            onClick={() => navigate("/team")}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Shield className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800 dark:text-white">
                Mi Red (Equipo)
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={() => navigate("/wallet")}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800 dark:text-white">
                Mi Billetera
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={() => navigate("/training")}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800 dark:text-white">
                Centro de Capacitación
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={() => navigate("/mentor")}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800 dark:text-white">
                Mentor IA (Gemini)
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={() => navigate("/tickets")}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800 dark:text-white">
                Soporte (Tickets)
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={() => setIsChangingPassword(true)}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400">
                <Settings className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800 dark:text-white">Cambiar Contraseña</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={() => window.open("https://wa.me/573000000000", "_blank")}
            className="w-full p-5 flex items-center justify-between hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors border-b border-slate-100 dark:border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Phone className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800 dark:text-white">Soporte WhatsApp</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={handleLogout}
            className="w-full p-5 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-red-600 dark:text-red-400"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="font-bold">Cerrar Sesión</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
