import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  name: string;
  email: string;
  plan: string;
  plan_id?: string;
  level: number;
  xp: number;
  percentage: number;
  totalEarned: number;
  badge?: string;
  role: 'user' | 'admin';
  referral_code?: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  is_tasks_active?: boolean;
  task_start_date?: string;
  task_end_date?: string;
  wallet_balance?: number;
  inventory_status?: string;
  compliance_score?: number;
  trust_score?: number;
  leader_level?: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Try to load user from localStorage for immediate rendering
    try {
      const savedUser = localStorage.getItem('impulsa_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error("Error loading user from localStorage:", e);
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshPromise = useRef<Promise<void> | null>(null);

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem('impulsa_user');
      await supabase.auth.signOut();
      setUser(null);
      // Ensure redirection to homepage after logout
      window.location.href = "/";
    } catch (err) {
      console.error('Error logging out', err);
      // Still clear user and redirect even if signOut fails
      localStorage.removeItem('impulsa_user');
      setUser(null);
      window.location.href = "/";
    }
  }, []);

  const refreshUser = useCallback(async () => {
    console.log("refreshUser called, current loading state:", loading);
    if (refreshPromise.current) {
      console.log("Ya hay un refreshUser en curso, esperando...");
      return refreshPromise.current;
    }

    refreshPromise.current = (async () => {
      // If we already have a cached user, we don't necessarily need to set loading to true
      // unless it's the first load or we want to force a refresh indicator
      if (!user) setLoading(true);
      
      setError(null);
      console.log("Iniciando refreshUser...");
      
      try {
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          throw new Error("Faltan las credenciales de Supabase. Por favor, configúralas en el panel de Secrets.");
        }

        console.log("Fetching user session with timeout...");
        
        // Add timeout to getSession
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error("Timeout al obtener sesión de Supabase")), 15000)
        );

        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]);
        
        console.log("Session check result:", { hasSession: !!session, sessionError });
        
        if (sessionError) {
          console.error("Error de sesión de Supabase:", sessionError);
          throw sessionError;
        }
        
        if (!session?.user) {
          console.log("No hay sesión activa en Supabase");
          localStorage.removeItem('impulsa_user');
          setUser(null);
          return;
        }

        console.log("Sesión activa para:", session.user.email);
        console.log("Iniciando fetch a /api/account/data...");

        // Add a timeout to the fetch call
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
          // Fetch user profile from our backend API to bypass RLS recursion issues
          const profileResponse = await fetch('/api/account/data', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            },
            signal: controller.signal
          }).catch(err => {
            if (err.name === 'AbortError') {
              throw new Error("La solicitud de datos de usuario excedió el tiempo de espera (30s)");
            }
            console.warn("Fetch error (network level):", err.message);
            throw new Error(`Error de red al conectar con el servidor: ${err.message}`);
          });

          clearTimeout(timeoutId);
          console.log("Profile response received:", { 
            status: profileResponse.status, 
            statusText: profileResponse.statusText,
            ok: profileResponse.ok 
          });

          if (!profileResponse.ok) {
            const profileError = await profileResponse.json().catch(() => ({}));
            console.error("Error de API al obtener perfil:", profileError);
            throw new Error(profileError.error || profileError.message || `Error del servidor (${profileResponse.status})`);
          }

          const profile = await profileResponse.json();
          console.log("Perfil obtenido exitosamente desde API:", profile.role);

          // Save to localStorage for next time
          localStorage.setItem('impulsa_user', JSON.stringify(profile));
          setUser(profile as User);
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          throw fetchErr;
        }
      } catch (err: any) {
        let errorMessage = err.message || 'Error de conexión';
        if (errorMessage === 'Failed to fetch' || errorMessage.includes('Failed to fetch')) {
          errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet o la configuración de Supabase.';
          console.warn("Advertencia en refreshUser (Red/Supabase):", errorMessage);
        } else {
          console.error("Error crítico en refreshUser:", err);
        }

        // Don't show "Lock broken" as a user-facing error if possible
        if (err.message?.includes('steal')) {
          console.warn("Refresh lock stolen, ignoring this specific error.");
          return;
        }
        
        setError(errorMessage);
        // If we have a cached user but refresh fails, we might want to keep the cached user
        // but show an error indicator. For now, we'll keep the user if it exists.
        if (!user) setUser(null);
      } finally {
        console.log("Finalizando refreshUser, loading=false. Error state:", error);
        setLoading(false);
        refreshPromise.current = null;
      }
    })();

    return refreshPromise.current;
  }, [user]);

  useEffect(() => {
    refreshUser();

    // Safety fallback: if loading is still true after 35 seconds, force it to false
    const safetyTimeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn("UserContext Safety timeout: forcing loading to false after 35s");
          return false;
        }
        return prev;
      });
    }, 35000);

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change event:", event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        refreshUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false); // Ensure loading is false on sign out
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [refreshUser]);

  return (
    <UserContext.Provider value={{ user, loading, error, refreshUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
