import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { supabase } from "../lib/supabase";

export default function Register() {
  const navigate = useNavigate();
  const { refreshUser, user, loading } = useUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referrerCode, setReferrerCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (user && isInitialLoad) {
        if (user.role === 'admin') {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }
      setIsInitialLoad(false);
    }
  }, [user, loading, navigate, isInitialLoad]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          }
        }
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (!authData.user) {
        throw new Error("Error al crear el usuario");
      }

      // 2. Create profile in 'users' table
      // We do this manually to ensure the profile exists even if the trigger is missing
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          name: name,
          role: 'user',
          plan: 'Gratis',
          level: 1,
          xp: 0,
          percentage: 10,
          referral_code: name.substring(0, 3).toUpperCase() + Math.floor(1000 + Math.random() * 9000)
        });

      if (profileError && profileError.code !== '23505') { // Ignore if already exists
        console.error("Error creating profile:", profileError);
        // We don't throw here because the user is already created in Auth
      }

      // 3. Process referral if provided
      if (referrerCode) {
        // We call the backend to process the referral securely since it requires
        // looking up another user's ID and inserting into the referrals table
        try {
          await fetch("/api/referrals/process", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${authData.session?.access_token}`
            },
            body: JSON.stringify({ referrerCode }),
          });
        } catch (refErr) {
          console.error("Error processing referral:", refErr);
          // We don't block the registration if referral fails
        }
      }
      
      // The UserContext will automatically detect the auth state change
      navigate("/plan-selection");
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 px-6 py-12">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-3">
            Crea tu cuenta
          </h1>
          <p className="text-slate-500 text-lg">
            Comienza tu camino hacia el 70% de comisión.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Nombre completo"
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                placeholder="Correo electrónico"
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                placeholder="Contraseña"
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Código de referido (Opcional)"
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                value={referrerCode}
                onChange={(e) => setReferrerCode(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-start text-sm">
            <label className="flex items-start gap-3 text-slate-600 cursor-pointer mt-1">
              <input
                type="checkbox"
                className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                required
              />
              <span className="leading-relaxed">
                Acepto los{" "}
                <a
                  href="#"
                  className="text-blue-600 font-medium hover:underline"
                >
                  Términos y Condiciones
                </a>{" "}
                y la{" "}
                <a
                  href="#"
                  className="text-blue-600 font-medium hover:underline"
                >
                  Política de Privacidad
                </a>
                .
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <span>{isLoading ? "Creando cuenta..." : "Continuar"}</span>
            {!isLoading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-slate-500">
            ¿Ya tienes una cuenta?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-blue-600 font-semibold hover:underline"
            >
              Inicia sesión
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
