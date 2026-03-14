import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSettings } from '../contexts/SettingsContext';
import { Loader2, CheckCircle, Image as ImageIcon, Upload, DollarSign, Percent, Settings as SettingsIcon } from 'lucide-react';

export default function SettingsManagement() {
  const { settings, refreshSettings } = useSettings();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Additional settings
  const [formData, setFormData] = useState({
    referral_percentage: 10,
    min_withdrawal: 50000,
    plan_price: 150000,
    maintenance_mode: false
  });

  useEffect(() => {
    // Load existing settings into form
    setFormData({
      referral_percentage: settings.referral_percentage || 10,
      min_withdrawal: settings.min_withdrawal || 50000,
      plan_price: settings.plan_price || 150000,
      maintenance_mode: settings.maintenance_mode === true
    });
  }, [settings]);

  const [logoFile, setLogoFile] = useState<File | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setLogoFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLogoPreview(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const updates = [];
      
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('app-assets')
          .upload(fileName, logoFile, { upsert: true });
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('app-assets')
          .getPublicUrl(fileName);
          
        updates.push({ key: 'app_logo', value: publicUrl });
      }
      
      updates.push({ key: 'referral_percentage', value: formData.referral_percentage });
      updates.push({ key: 'min_withdrawal', value: formData.min_withdrawal });
      updates.push({ key: 'plan_price', value: formData.plan_price });
      updates.push({ key: 'maintenance_mode', value: formData.maintenance_mode });

      for (const update of updates) {
        const { error } = await supabase
          .from('settings')
          .upsert(update);
        if (error) throw error;
      }

      alert('Configuración guardada con éxito');
      await refreshSettings();
      setLogoPreview(null); // Reset preview so it uses the actual setting
      setLogoFile(null);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Configuración General</h2>
        <p className="text-slate-400 text-sm">Administra los ajustes globales de la plataforma.</p>
      </div>

      {/* Branding Settings */}
      <div className="bg-[#111] rounded-3xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-emerald-500" />
            Logo de la Aplicación
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Sube el logo que se mostrará en la barra de navegación y en la página de inicio.
          </p>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1 space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-sm font-medium mb-2">Recomendaciones de imagen:</p>
                <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
                  <li>Resolución recomendada: <strong className="text-white">400x120 píxeles</strong> (o proporción similar).</li>
                  <li>Formato: <strong className="text-white">PNG con fondo transparente</strong>.</li>
                  <li>Tamaño máximo: <strong className="text-white">2MB</strong>.</li>
                </ul>
              </div>
              
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/svg+xml"
                className="hidden"
                ref={fileInputRef}
                onChange={handleLogoUpload}
              />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 border-dashed rounded-xl flex items-center justify-center gap-2 transition-all text-sm font-medium"
              >
                <Upload className="w-4 h-4" />
                Seleccionar Imagen
              </button>
            </div>
            
            <div className="w-full md:w-64 shrink-0">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Vista Previa</p>
              <div className="h-32 bg-[#0a0a0a] rounded-2xl border border-white/10 flex items-center justify-center p-4 relative overflow-hidden group">
                {logoPreview || settings.app_logo ? (
                  <img 
                    src={logoPreview || settings.app_logo} 
                    alt="Logo Preview" 
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <span className="text-slate-600 text-sm font-medium">Sin logo</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Settings */}
      <div className="bg-[#111] rounded-3xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-emerald-500" />
            Parámetros Financieros
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Configura los valores globales para comisiones, retiros y planes.
          </p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-500" />
                Porcentaje de Comisión Base (%)
              </label>
              <input 
                type="number" 
                min="0"
                max="100"
                value={formData.referral_percentage}
                onChange={(e) => setFormData({...formData, referral_percentage: Number(e.target.value)})}
                className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors"
              />
              <p className="text-xs text-slate-500 mt-1">Porcentaje que gana un usuario por invitar a otro.</p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Mínimo de Retiro (COP)
              </label>
              <input 
                type="number" 
                min="0"
                value={formData.min_withdrawal}
                onChange={(e) => setFormData({...formData, min_withdrawal: Number(e.target.value)})}
                className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors"
              />
              <p className="text-xs text-slate-500 mt-1">Monto mínimo que un usuario puede solicitar retirar.</p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Precio del Plan Pro (COP)
              </label>
              <input 
                type="number" 
                min="0"
                value={formData.plan_price}
                onChange={(e) => setFormData({...formData, plan_price: Number(e.target.value)})}
                className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors"
              />
              <p className="text-xs text-slate-500 mt-1">Costo de la suscripción a la plataforma.</p>
            </div>
          </div>
        </div>
      </div>

      {/* System Status Settings */}
      <div className="bg-[#111] rounded-3xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-amber-500" />
            Estado del Sistema
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Controla la disponibilidad global de la plataforma.
          </p>
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
            <div>
              <p className="font-bold text-white">Modo Mantenimiento</p>
              <p className="text-xs text-slate-500 mt-1">
                Si se activa, los usuarios no podrán acceder a la plataforma (excepto administradores).
              </p>
            </div>
            <button 
              onClick={() => setFormData({...formData, maintenance_mode: !formData.maintenance_mode})}
              className={`w-14 h-7 rounded-full transition-all relative ${formData.maintenance_mode ? 'bg-amber-500' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${formData.maintenance_mode ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSaveSettings}
          disabled={savingSettings}
          className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          {savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          Guardar Toda la Configuración
        </button>
      </div>
    </div>
  );
}
