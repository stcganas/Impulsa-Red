import React from "react";
import { User } from "lucide-react";
import { useSettings } from "../contexts/SettingsContext";

interface InviteProfileCardProps {
  name: string;
  photoUrl?: string;
  title?: string;
  message?: string;
}

export default function InviteProfileCard({ name, photoUrl, title, message }: InviteProfileCardProps) {
  const { settings } = useSettings();
  return (
    <div className="flex flex-col items-center text-center space-y-6">
      {/* Profile Photo */}
      <div className="relative">
        <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-100 flex items-center justify-center">
          {photoUrl ? (
            <img 
              src={photoUrl} 
              alt={name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <User className="w-16 h-16 text-slate-300" />
          )}
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm uppercase tracking-wider">
          Referente Verificado
        </div>
      </div>

      {/* Name & Message */}
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {title || `${name} te invita a ${settings.app_name || "ImpulsaRed"} 🚀`}
        </h1>
        <p className="text-slate-600 font-medium max-w-xs mx-auto leading-relaxed">
          {message || "Gana dinero construyendo tu red y completando misiones diarias."}
        </p>
      </div>
    </div>
  );
}
