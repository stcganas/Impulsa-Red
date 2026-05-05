/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, Component, ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import MobileLayout from "./components/layout/MobileLayout";
import LandingPage from "./pages/LandingPage";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PlanSelection from "./pages/PlanSelection";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Referrals from "./pages/Referrals";
import Levels from "./pages/Levels";
import Profile from "./pages/Profile";
import Wallet from "./pages/Wallet";
import Training from "./pages/Training";
import Mentor from "./pages/Mentor";
import Tickets from "./pages/Tickets";
import AdminDashboard from "./pages/AdminDashboard";
import Ranking from "./pages/Ranking";
import TeamPanel from "./pages/TeamPanel";
import MaintenancePage from "./pages/MaintenancePage";
import InviteLandingPage from "./pages/InviteLandingPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { UserProvider, useUser } from "./contexts/UserContext";
import { FeatureProvider } from "./contexts/FeatureContext";
import { SettingsProvider, useSettings } from "./contexts/SettingsContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import LiveActivityNotifications from "./components/LiveActivityNotifications";
import { APP_VERSION, STORAGE_KEYS } from "./constants";

const LoadingScreen = ({ message = "Cargando aplicación..." }: { message?: string }) => (
  <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-6 p-6">
    <div className="relative">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-8 w-8 bg-emerald-500/10 rounded-full"></div>
      </div>
    </div>
    <div className="text-center space-y-2">
      <p className="text-white font-medium text-lg">{message}</p>
      <p className="text-slate-400 text-sm max-w-xs mx-auto">
        Estamos preparando todo para tu mejor experiencia. Esto solo tomará un momento.
      </p>
    </div>
    <button 
      onClick={() => window.location.reload()}
      className="mt-4 text-emerald-500 text-xs hover:underline"
    >
      ¿Tarda demasiado? Reintentar
    </button>
  </div>
);

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: 'user' | 'admin' }) => {
  const { user, loading } = useUser();
  const { isMaintenanceMode, loading: settingsLoading } = useSettings();
  
  console.log("ProtectedRoute check:", { loading, settingsLoading, hasUser: !!user });

  if (loading || settingsLoading) {
    return <LoadingScreen message="Verificando acceso..." />;
  }
  
  const userRole = user?.role || 'user';

  // Allow admins to bypass maintenance mode
  if (isMaintenanceMode && userRole !== 'admin') {
    return <Navigate to="/maintenance" replace />;
  }

  if (!user) {
    console.log("ProtectedRoute: No user found, redirecting to /login");
    return <Navigate to="/login" replace />;
  }
  
  if (role && userRole !== role) {
    console.log(`ProtectedRoute: Role mismatch. Expected ${role}, got ${userRole}. Redirecting...`);
    return <Navigate to={userRole === 'admin' ? "/admin" : "/dashboard"} replace />;
  }
  
  return <>{children}</>;
};

const MaintenanceGuard = ({ children }: { children: React.ReactNode }) => {
  const { isMaintenanceMode, loading } = useSettings();
  const { user, loading: userLoading } = useUser();
  const location = useLocation();

  console.log("MaintenanceGuard check:", { loading, userLoading, isMaintenanceMode, path: location.pathname });

  if (loading || userLoading) {
    return <LoadingScreen message="Cargando configuración..." />;
  }
  
  // Allow access to login page even in maintenance mode so admins can log in
  // Also allow access to maintenance page itself to avoid loops
  const isLoginPage = location.pathname === '/login';
  const isMaintenancePage = location.pathname === '/maintenance';
  const isAdmin = user?.role === 'admin';

  if (isMaintenanceMode && !isAdmin && !isLoginPage && !isMaintenancePage) {
    console.log("MaintenanceGuard: Maintenance mode active, redirecting to /maintenance");
    return <Navigate to="/maintenance" replace />;
  }

  return <>{children}</>;
};

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };
  props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0a0a0a] p-6 text-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Algo salió mal</h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
            La aplicación encontró un error inesperado. Por favor, intenta recargar la página.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
          >
            Recargar Página
          </button>
          {import.meta.env.DEV && (
            <pre className="mt-8 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-left text-xs overflow-auto max-w-full text-red-500">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const isDev = import.meta.env.DEV;
  console.log("App rendering, isDev:", isDev);
  
  useEffect(() => {
    console.log("App component mounted");
    console.log("Supabase URL configured:", !!import.meta.env.VITE_SUPABASE_URL);

    // Version check to clear stale cache
    const savedVersion = localStorage.getItem(STORAGE_KEYS.VERSION);
    if (savedVersion !== APP_VERSION) {
      console.log(`New version detected: ${APP_VERSION}. Clearing stale cache...`);
      // Clear specific keys but keep some if necessary (like theme)
      Object.values(STORAGE_KEYS).forEach(key => {
        if (key !== STORAGE_KEYS.VERSION) {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem(STORAGE_KEYS.VERSION, APP_VERSION);
      // Optional: reload if we want to be absolutely sure
      // window.location.reload();
    }
  }, []);

  console.log("App component rendering...");
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SettingsProvider>
          <UserProvider>
            <FeatureProvider>
              <NotificationProvider>
                <BrowserRouter>
                  <LiveActivityNotifications />
                  <Routes>
                    {/* Public Pages */}
                  <Route path="/" element={<MaintenanceGuard><LandingPage /></MaintenanceGuard>} />
                  <Route path="/onboarding" element={<MaintenanceGuard><Onboarding /></MaintenanceGuard>} />
                  <Route path="/login" element={<MaintenanceGuard><Login /></MaintenanceGuard>} />
                  <Route path="/register" element={<MaintenanceGuard><Register /></MaintenanceGuard>} />
                  <Route path="/forgot-password" element={<MaintenanceGuard><ForgotPassword /></MaintenanceGuard>} />
                  <Route path="/reset-password" element={<MaintenanceGuard><ResetPassword /></MaintenanceGuard>} />
                  <Route path="/invite/:referralCode" element={<InviteLandingPage />} />
                  <Route path="/maintenance" element={<MaintenancePage />} />
                  <Route path="/plan-selection" element={<ProtectedRoute><PlanSelection /></ProtectedRoute>} />
                  
                  {/* Standalone Pages */}
                  <Route path="/mentor" element={<ProtectedRoute><Mentor /></ProtectedRoute>} />

                  {/* Main App */}
                  <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
                  
                  <Route element={<ProtectedRoute role="user"><MobileLayout /></ProtectedRoute>}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/referrals" element={<Referrals />} />
                    <Route path="/wallet" element={<Wallet />} />
                    <Route path="/training" element={<Training />} />
                    <Route path="/ranking" element={<Ranking />} />
                    <Route path="/team" element={<TeamPanel />} />
                    <Route path="/levels" element={<Levels />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/tickets" element={<Tickets />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </NotificationProvider>
          </FeatureProvider>
        </UserProvider>
      </SettingsProvider>
    </ThemeProvider>
  </ErrorBoundary>
);
}
