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
  Wallet,
  Sparkles,
  Edit2,
  X,
  Phone,
  MapPin,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";
import { supabase } from "../lib/supabase";

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
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
    navigate("/login");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ newPassword: passwordData.newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al cambiar contraseña");
      }

      alert("Contraseña actualizada con éxito");
      setIsChangingPassword(false);
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      console.error("Error changing password:", error);
      alert(error.message || "Error al cambiar contraseña");
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshUser();
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Error al subir la foto de perfil");
    } finally {
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
          phone: formData.phone,
          address: formData.address
        })
        .eq('id', user.id);

      if (error) throw error;
      
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
    <div className="min-h-screen bg-slate-50 pb-24 relative overflow-hidden">
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
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">Editar Perfil</h3>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      placeholder="+57 300 000 0000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Dirección</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
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
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">Cambiar Contraseña</h3>
                <button 
                  onClick={() => setIsChangingPassword(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nueva Contraseña</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Confirmar Contraseña</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    placeholder="Repite la contraseña"
                    minLength={6}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Actualizar Contraseña"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-slate-900 text-white pt-12 pb-32 px-6 rounded-b-[40px] shadow-xl relative">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-blue-600/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
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
          className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 text-center"
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
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover group-hover:opacity-75 transition-opacity"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-100 border-4 border-white shadow-lg flex items-center justify-center text-blue-600 text-3xl font-black group-hover:bg-blue-200 transition-colors">
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
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {user.name}
          </h2>
          <p className="text-slate-500 font-medium mb-2">{user.email}</p>
          
          {(user.phone || user.address) && (
            <div className="flex flex-col items-center gap-1 mb-6 text-sm text-slate-400">
              {user.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {user.phone}</span>}
              {user.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {user.address}</span>}
            </div>
          )}
          {!user.phone && !user.address && <div className="mb-6" />}

          <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-2xl p-4 mb-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Plan
              </p>
              <p className="font-black text-slate-900">{user.plan}</p>
            </div>
            <div className="border-x border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Nivel
              </p>
              <p className="font-black text-slate-900">{user.level}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Comisión
              </p>
              <p className="font-black text-emerald-600">
                {user.percentage}%
              </p>
            </div>
          </div>

          {user.plan !== 'Élite' && (
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
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex justify-between items-center"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Total Generado
            </p>
            <p className="font-black text-2xl text-slate-900">
              ${(user.totalEarned || 0).toLocaleString("es-CO")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Código
            </p>
            <p className="font-bold text-slate-700">{user.referral_code}</p>
          </div>
        </motion.div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <button 
            onClick={() => navigate("/wallet")}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800">
                Mi Billetera
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={() => navigate("/training")}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800">
                Centro de Capacitación
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={() => navigate("/mentor")}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800">
                Mentor IA (Gemini)
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={() => setIsChangingPassword(true)}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <Settings className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800">Cambiar Contraseña</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={() => window.open("https://wa.me/573000000000", "_blank")}
            className="w-full p-5 flex items-center justify-between hover:bg-emerald-50 transition-colors border-b border-slate-100"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Phone className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800">Soporte WhatsApp</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={handleLogout}
            className="w-full p-5 flex items-center justify-between hover:bg-red-50 transition-colors text-red-600"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
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
