import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  name: string;
  email: string;
  plan: string;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshPromise = useRef<Promise<void> | null>(null);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error logging out', err);
    }
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (refreshPromise.current) {
      console.log("Ya hay un refreshUser en curso, esperando...");
      return refreshPromise.current;
    }

    refreshPromise.current = (async () => {
      setLoading(true);
      setError(null);
      console.log("Iniciando refreshUser...");
      
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error de sesión:", sessionError);
          throw sessionError;
        }
        
        if (!session?.user) {
          console.log("No hay sesión activa");
          setUser(null);
          return;
        }

        console.log("Sesión encontrada para:", session.user.email);

        // Fetch user profile from our backend API to bypass RLS recursion issues
        const profileResponse = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!profileResponse.ok) {
          const profileError = await profileResponse.json().catch(() => ({}));
          console.error("Error al obtener perfil desde API:", profileError);
          
          // Fallback retry logic if needed, but the API should be more reliable
          throw new Error(profileError.error || 'Error al obtener el perfil');
        }

        const profile = await profileResponse.json();
        console.log("Perfil obtenido exitosamente desde API:", profile.role);

        // Calculate total earned from transactions (only referral commissions)
        const { data: txs } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', session.user.id)
          .eq('type', 'referral_commission')
          .eq('status', 'completed');
          
        const totalEarned = txs?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
        
        setUser({ ...profile, totalEarned } as User);
      } catch (err: any) {
        console.error("Error crítico en refreshUser:", err);
        // Don't show "Lock broken" as a user-facing error if possible
        if (err.message?.includes('steal')) {
          console.warn("Refresh lock stolen, ignoring this specific error.");
          return;
        }
        setError(err.message || 'Error de conexión');
        setUser(null);
      } finally {
        console.log("Finalizando refreshUser, loading=false");
        setLoading(false);
        refreshPromise.current = null;
      }
    })();

    return refreshPromise.current;
  }, []);

  useEffect(() => {
    refreshUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        refreshUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
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
