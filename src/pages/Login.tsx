import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { supabase } from "../lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const { user, loading, refreshUser } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log("Login state check:", { loading, hasUser: !!user, role: user?.role });
    if (!loading && user) {
      if (user.role === 'admin') {
        console.log("Redirigiendo a /admin");
        navigate("/admin");
      } else {
        console.log("Redirigiendo a /dashboard");
        navigate("/dashboard");
      }
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    console.log("Iniciando login para:", email);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("Error de Supabase Auth:", signInError);
        throw new Error(signInError.message === 'Invalid login credentials' 
          ? 'Credenciales inválidas' 
          : signInError.message);
      }
      
      console.log("Login exitoso, forzando refreshUser...", data.user?.id);
      await refreshUser();
    } catch (err: any) {
      console.error("Login error:", err);
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
            Bienvenido de nuevo
          </h1>
          <p className="text-slate-500 text-lg">
            Ingresa para continuar tu crecimiento.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
              {error}
            </div>
          )}
          <div className="space-y-4">
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
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Recordarme</span>
            </label>
            <a href="#" className="text-blue-600 font-medium hover:underline">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <span>{isLoading ? "Iniciando..." : "Iniciar Sesión"}</span>
            {!isLoading && <ArrowRight className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setEmail("ericcharris432@gmail.com");
              setPassword("password123");
            }}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 font-medium hover:border-blue-400 hover:text-blue-600 transition-all"
          >
            Usar cuenta de prueba (Demo)
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-slate-500">
            ¿No tienes una cuenta?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-blue-600 font-semibold hover:underline"
            >
              Regístrate aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
