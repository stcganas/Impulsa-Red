/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import AdminDashboard from "./pages/AdminDashboard";
import Ranking from "./pages/Ranking";
import MaintenancePage from "./pages/MaintenancePage";
import { UserProvider, useUser } from "./contexts/UserContext";
import { SettingsProvider, useSettings } from "./contexts/SettingsContext";

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: 'user' | 'admin' }) => {
  const { user, loading } = useUser();
  const { isMaintenanceMode } = useSettings();
  
  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div></div>;
  
  // Allow admins to bypass maintenance mode
  if (isMaintenanceMode && user?.role !== 'admin') {
    return <Navigate to="/maintenance" />;
  }

  if (!user) return <Navigate to="/login" />;
  
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? "/admin" : "/dashboard"} />;
  }
  
  return <>{children}</>;
};

const MaintenanceGuard = ({ children }: { children: React.ReactNode }) => {
  const { isMaintenanceMode, loading } = useSettings();
  const { user } = useUser();

  if (loading) return null;
  
  if (isMaintenanceMode && user?.role !== 'admin') {
    return <Navigate to="/maintenance" />;
  }

  return <>{children}</>;
};

export default function App() {
  useEffect(() => {
    console.log("App initialized");
    console.log("Supabase URL configured:", !!import.meta.env.VITE_SUPABASE_URL);
  }, []);

  return (
    <SettingsProvider>
      <UserProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<MaintenanceGuard><LandingPage /></MaintenanceGuard>} />
            <Route path="/onboarding" element={<MaintenanceGuard><Onboarding /></MaintenanceGuard>} />
            <Route path="/login" element={<MaintenanceGuard><Login /></MaintenanceGuard>} />
            <Route path="/register" element={<MaintenanceGuard><Register /></MaintenanceGuard>} />
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
              <Route path="/levels" element={<Levels />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </UserProvider>
    </SettingsProvider>
  );
}
